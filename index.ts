import express, { NextFunction, Request, Response } from 'express';
import axios from 'axios';
import pool from './utils/database';
import { decryptToken, encryptToken } from './utils/encryption';
import { groupCommitsByPeriod } from './utils/week-number';
import { getAllMembers } from './utils/github';
const app = express();

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

const PORT = process.env.PORT || 3002;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = 'funbleDev';
const REPO_NAME = 'funbleWebView';

export const validateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const encrypted_token = req.headers.authorization?.split(' ')[2];
    const iv = req.headers.iv as string;
    const salt = req.headers.salt as string;
    console.log(encrypted_token, iv, salt);
    if (!encrypted_token || !iv || !salt) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    // 토큰 복호화
    const decryptedToken = decryptToken(
      encrypted_token,
      iv,
      salt
    );

    console.log(decryptedToken);

    try {
      req.user = decryptedToken;
      next();
    } catch (error) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }
  } catch (error) {
    console.error('Token validation error:', error);
    res.status(500).json({ error: 'Internal server error' });
    return;
  }
};

interface GitHubUser {
  login: string;
  id: number;
  name: string | null;
  email: string | null;
}
/**
 * 조직의 모든 멤버 정보를 가져오는 함수
 * @param token GitHub 인증 토큰
 * @param org 조직 이름
 * @returns 조직 멤버 목록
 */
const getTeamMembers = async (token: string, org: string, teamSlug: string) => {
  return axios.get(`https://api.github.com/orgs/${org}/teams/${teamSlug}/members`, {
    headers: { Authorization: `token ${token}` }
  });
};


// JSON 요청 파싱 미들웨어
app.use(express.json());


// /commits 엔드포인트: GitHub API를 호출해 커밋 로그 반환
app.get('/commits', validateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    console.log(req.user)
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

app.post('/auth/join', async (req: Request, res: Response) => {
  try {
    const { github_token, repo_owner, repo_name } = req.body;

    const userInfo = await getTeamMembers(github_token, repo_owner, repo_name);
  console.log(userInfo)
    // if (!githubToken) {
    //   res.status(400).json({ error: 'GitHub token is required' });
    //   return;
    // }
    //  // GitHub API를 호출하여 토큰 유효성 검증
    //  try {
    //   await axios.get('https://api.github.com/user', {
    //     headers: { Authorization: `token ${githubToken}` }
    //   });
    // } catch (error) {
    //    res.status(401).json({ error: 'Invalid GitHub token' });
    //    return;
    // }

    // // 토큰 암호화
    // const encryptedData = encryptToken(githubToken);

    // // DB에 암호화된 토큰 저장
    // await pool.execute(
    //   `INSERT INTO tokens (iv, salt, encrypted_token) 
    //    VALUES (?, ?, ?, ?)
    //    ON DUPLICATE KEY UPDATE 
    //    iv = VALUES(iv),
    //    salt = VALUES(salt),
    //    encrypted_token = VALUES(encrypted_token)`,
    //   [encryptedData.iv, encryptedData.salt, encryptedData.encryptedData]
    // );

    // res.status(200).json({ message: 'Token saved successfully' });
  }
  catch (error) {
    res.status(500).send('An unexpected error occurred');
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});