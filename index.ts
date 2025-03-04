import express, { NextFunction, Request, Response } from 'express';
import axios from 'axios';
import pool from './utils/database';
import { decryptToken, encryptToken, encryptMultipleValues, decryptMultipleValues } from './utils/encryption';
import { groupCommitsByPeriod } from './utils/week-number';
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

interface UserData {
  github_token: string;
  username: string;
  repo_owner: string;
  iv: string;
  salt: string;
}

const getUserFromDB = async (username: string, inputToken?: string, inputRepoOwner?: string): Promise<UserData | null> => {
  try {
    // 1. username으로 DB에서 사용자 정보 조회
    const [rows] = await pool.execute(
      'SELECT iv, salt, encrypted_token, encrypted_username, encrypted_repo_owner FROM tokens WHERE encrypted_username = ?',
      [username]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return null;
    }

    const row = rows[0] as any;

    // 2. 입력받은 토큰과 owner_name이 있는 경우 검증
    if (inputToken && inputRepoOwner) {
      // 저장된 salt와 iv로 입력값들을 암호화
      const encryptedInput = encryptMultipleValues(
        {
          github_token: inputToken,
          repo_owner: inputRepoOwner,
        },
        row.salt,
        row.iv
      ); // DB의 salt와 iv 사용

      // DB에 저장된 값과 비교
      if (
        row.encrypted_token !== encryptedInput.encryptedValues.github_token ||
        row.encrypted_repo_owner !== encryptedInput.encryptedValues.repo_owner
      ) {
        return null;
      }
    }

    return {
      github_token: row.encrypted_token,
      username: username,
      repo_owner: row.encrypted_repo_owner,
      iv: row.iv,
      salt: row.salt,
    };
  } catch (error) {
    console.error('DB Error:', error);
    return null;
  }
};

export const validateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const encrypted_token = req.headers.authorization?.split(' ')[2];
    const iv = req.headers.iv as string;
    const salt = req.headers.salt as string;
    const username = req.headers.username as string;
    const repo_owner = req.headers.repo_owner as string;

    console.log(encrypted_token, iv, salt, username, repo_owner);

    if (!encrypted_token || !iv || !salt || !username) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    // 토큰 복호화
    const decryptedToken = decryptToken(encrypted_token, iv, salt);

    const decryptedRepoOwner = decryptToken(repo_owner, iv, salt);

    console.log(decryptedToken, decryptedRepoOwner);

    try {
      req.user = {
        token: decryptedToken,
        username: username,
        repoOwner: decryptedRepoOwner,
      };

      next();
    } catch (error) {
      console.log(error);
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }
  } catch (error) {
    console.error('Token validation error:', error);
    res.status(500).json({ error: 'Internal server error' });
    return;
  }
};

// JSON 요청 파싱 미들웨어
app.use(express.json());

/**
 * 레포 리스트 조회
 */
app.get('/', validateToken, async (req: Request, res: Response) => {
  try {
    const { username, repoOwner, token } = req.user;

    const response = await axios.get(`https://api.github.com/orgs/${repoOwner}/repos`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
      },
    });

    // 레포 리스트만 추출해서 반환
    const data = response.data.map((repo: any) => ({
      name: repo.name,
      url: repo.url,
    }));

    res.status(200).json({
      message: 'Data saved successfully',
      data,
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      res.status(500).send(error.message);
    } else {
      res.status(500).send('An unexpected error occurred');
    }
  }
});

// 1. 브랜치 목록 조회
app.get('/branches', validateToken, async (req: Request, res: Response) => {
  try {
    const { token, username, repoOwner } = req.user;

    const { branch } = req.query;

    if (!branch) {
      res.status(400).json({ error: 'Required fields are missing' });
      return;
    }

    const response = await axios.get(`https://api.github.com/repos/${repoOwner}/${branch}/branches`, {
      headers: {
        Authorization: `token ${token}`,
      },
    });

    // 브랜치 정보 반환
    res.status(200).json({
      message: 'Data saved successfully',
      data: response.data,
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      res.status(500).send(error.message);
    } else {
      res.status(500).send('An unexpected error occurred');
    }
  }
});

// /commits 엔드포인트: GitHub API를 호출해 커밋 로그 반환
app.get('/commits', validateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    console.log(req.user);
    const response = await axios.get(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/commits`, {
      headers: { Authorization: `token ${GITHUB_TOKEN}` },
    });

    res.status(200).json({
      message: 'Data saved successfully',
      data: response.data,
    });
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
    const response = await axios.get(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/commits?sha=${branch}`, {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
      },
      params: {
        sha: branch,
        author: myUsername,
      },
    });

    // 받아온 커밋 배열을 기간별로 그룹핑
    const grouped = groupCommitsByPeriod(response.data);

    res.status(200).json({
      message: 'Data saved successfully',
      data: grouped,
    });
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
    const { github_token, username, repo_owner } = req.body;

    if (!github_token || !username || !repo_owner) {
      res.status(400).json({ error: 'Required fields are missing' });
      return;
    }

    // GitHub API를 호출하여 토큰 유효성 검증
    try {
      await axios.get('https://api.github.com/user', {
        headers: { Authorization: `token ${github_token}` },
      });
    } catch (error) {
      res.status(401).json({ error: 'Invalid GitHub token' });
      return;
    }

    // 여러 값을 한 번에 암호화
    const encryptedData = encryptMultipleValues({
      github_token,
      username,
      repo_owner,
    });

    // DB에 암호화된 데이터 저장
    await pool.execute(
      `INSERT INTO tokens (iv, salt, encrypted_token, encrypted_username, encrypted_repo_owner) 
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
       iv = VALUES(iv),
       salt = VALUES(salt),
       encrypted_token = VALUES(encrypted_token),
       encrypted_username = VALUES(encrypted_username),
       encrypted_repo_owner = VALUES(encrypted_repo_owner)`,
      [encryptedData.iv, encryptedData.salt, encryptedData.encryptedValues.github_token, username, encryptedData.encryptedValues.repo_owner]
    );

    res.status(200).json({
      message: 'Data saved successfully',
      iv: encryptedData.iv,
      salt: encryptedData.salt,
    });
  } catch (error) {
    console.error('Join error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { username, github_token, repo_owner } = req.body;

    if (!username || !github_token || !repo_owner) {
      res.status(400).json({ error: 'Username, github_token, and repo_owner are required' });
      return;
    }

    const userData = await getUserFromDB(username, github_token, repo_owner);

    if (!userData) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // GitHub API로 토큰 유효성 검증
    res.status(200).json({
      message: 'Login successful',
      user: {
        username: userData.username,
        repo_owner: userData.repo_owner,
        github_token: userData.github_token,
      },
      iv: userData.iv,
      salt: userData.salt,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
