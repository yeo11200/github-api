
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

  export { groupCommitsByPeriod}