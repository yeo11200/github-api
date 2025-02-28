import express, { Request, Response } from 'express';
import axios from 'axios';

const app = express();

// JSON 요청 파싱 미들웨어
app.use(express.json());

const PORT = process.env.PORT || 3002;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = 'funbleDev';
const REPO_NAME = 'funbleWebView';

const getISOWeekNumber = (date: Date): number => {
    const tempDate = new Date(date.getTime());
    tempDate.setHours(0, 0, 0, 0);
    // 해당 주의 목요일을 기준으로 함
    tempDate.setDate(tempDate.getDate() + 3 - ((tempDate.getDay() + 6) % 7));
    // 1월 4일은 항상 1주차에 포함됨
    const week1 = new Date(tempDate.getFullYear(), 0, 4);
    return 1 + Math.round(
      ((tempDate.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
    );
  };
  
  const groupCommitsByPeriod = (commits: any[]) => {
    const daily: Record<string, any[]> = {};
    const weekly: Record<string, any[]> = {};
    const monthly: Record<string, any[]> = {};
  
    commits.forEach(commit => {
      // 필요한 필드만 추출
      const message = commit.commit.message;
      const author = commit.commit.author.name;
      const dateStr = commit.commit.author.date;
      const date = new Date(dateStr);
  
      // 추출한 데이터로 새 객체 생성
      const filteredCommit = { message, author, date: dateStr };
  
      // 일간: YYYY-MM-DD 형식
      const dayKey = dateStr.split('T')[0];
      // 주간: 연도-W주차 형식
      const weekNumber = getISOWeekNumber(date);
      const weekKey = `${date.getFullYear()}-W${weekNumber}`;
      // 월간: YYYY-MM 형식
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
  
    if (!daily[dayKey]) {
        daily[dayKey] = [];
        };
        
      daily[dayKey].push(filteredCommit);
  
    if (!weekly[weekKey]) {
        weekly[weekKey] = [];
        };
        
      weekly[weekKey].push(filteredCommit);
  
    if (!monthly[monthKey]) {
        monthly[monthKey] = [];
        };
        
      monthly[monthKey].push(filteredCommit);
    });
  
    return { daily, weekly, monthly };
  };


// /commits 엔드포인트: GitHub API를 호출해 커밋 로그 반환
app.get('/commits', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/commits`, {
      headers: { Authorization: `token ${GITHUB_TOKEN}` }
    });
    res.json(response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      res.status(500).send(error.message);
    } else {
      res.status(500).send('An unexpected error occurred');
    }
  }
});


// 1. 브랜치 목록 조회
app.get('/branches', async (req: Request, res: Response) => {
    try {
      const response = await axios.get(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/branches`,
        {
          headers: {
            Authorization: `token ${GITHUB_TOKEN}`
          }
        }
      );
        
      // 브랜치 정보 반환
      res.json(response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        res.status(500).send(error.message);
      } else {
        res.status(500).send('An unexpected error occurred');
      }
    }
});
  
// 2. 특정 브랜치 커밋 목록 조회
app.get('/commits/:branch', async (req: Request, res: Response) => {
    const { branch } = req.params;
    const myUsername = 'Shinjinseop-Jacob'; // 내 GitHub 사용자명

    try {
      // 브랜치 이름을 쿼리 파라미터로 전달
      const response = await axios.get(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/commits?sha=${branch}`,
        {
          headers: {
            Authorization: `token ${GITHUB_TOKEN}`
            },
            params: {
                sha: branch,
                author: myUsername
            }
        }
      );
    
    // 받아온 커밋 배열을 기간별로 그룹핑
    const grouped = groupCommitsByPeriod(response.data);
    
    res.json(grouped);
        
    } catch (error) {
      if (axios.isAxiosError(error)) {
        res.status(500).send(error.message);
      } else {
        res.status(500).send('An unexpected error occurred');
      }
    }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});