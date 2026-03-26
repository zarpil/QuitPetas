function calculateStreak(user, allCheckins, allSmokingLogs) {
  const now = new Date();
  const quitDate = new Date(user.quitDate);
  const totalDays = Math.floor((now - quitDate) / (1000 * 60 * 60 * 24));
  let streak = totalDays;
  let mostRecentBrokenDate = null;

  // Si no hay datos, la racha son los días totales
  if (!allCheckins || !allSmokingLogs || (allCheckins.length === 0 && allSmokingLogs.length === 0)) {
    return streak;
  }

  // Helper para convertir fecha a string YYYY-MM-DD local (para agrupar)
  const toDateStr = (dateDate) => {
    const d = new Date(dateDate);
    d.setHours(0,0,0,0);
    return d.toISOString().split('T')[0];
  };

  if (user.planType === 'COLD_TURKEY' || !user.planType) {
    // Modo estricto: cualquier consumo rompe la racha
    let mostRecentCheckin = null;
    let mostRecentLog = null;
    
    // Buscar check-in más reciente con smoked=true
    const smokedCheckins = allCheckins.filter(c => c.smoked);
    if (smokedCheckins.length > 0) {
      mostRecentCheckin = new Date(Math.max(...smokedCheckins.map(c => new Date(c.date))));
    }
    // Buscar log más reciente
    if (allSmokingLogs.length > 0) {
      mostRecentLog = new Date(Math.max(...allSmokingLogs.map(l => new Date(l.createdAt))));
    }

    if (mostRecentCheckin && mostRecentLog) {
      mostRecentBrokenDate = mostRecentCheckin > mostRecentLog ? mostRecentCheckin : mostRecentLog;
    } else {
      mostRecentBrokenDate = mostRecentCheckin || mostRecentLog;
    }
  } 
  else if (user.planType === 'TAPER_FREQ' || user.planType === 'TAPER_GRAMS') {
    // Agrupar logs por día
    const dailyStats = {};
    const baseDailyJoints = user.dailyJoints || 0;
    const baseGramsPerJoint = user.gramsPerJoint || 0.3;

    allSmokingLogs.forEach(log => {
      const dStr = toDateStr(log.createdAt);
      if (!dailyStats[dStr]) dailyStats[dStr] = { joints: 0, grams: 0, ms: new Date(log.createdAt).getTime() };
      dailyStats[dStr].joints += 1;
      dailyStats[dStr].grams += (log.grams || baseGramsPerJoint);
      dailyStats[dStr].ms = Math.max(dailyStats[dStr].ms, new Date(log.createdAt).getTime());
    });

    allCheckins.filter(c => c.smoked).forEach(c => {
      const dStr = toDateStr(c.date);
      if (!dailyStats[dStr]) dailyStats[dStr] = { joints: 0, grams: 0, ms: new Date(c.date).getTime() };
      // Checkin es genérico, añadimos 1 peta si no estaba en log
      dailyStats[dStr].joints += 1;
      dailyStats[dStr].grams += baseGramsPerJoint;
      dailyStats[dStr].ms = Math.max(dailyStats[dStr].ms, new Date(c.date).getTime());
    });

    // Revisar cada día agrupado para buscar rupturas de límite
    let brokenDates = [];
    Object.keys(dailyStats).forEach(dStr => {
      const stats = dailyStats[dStr];
      const logDate = new Date(stats.ms);
      
      // Semanas desde que lo dejó
      const daysSinceQuit = Math.max(0, Math.floor((logDate - quitDate) / (1000 * 60 * 60 * 24)));
      const weeksPassed = Math.floor(daysSinceQuit / 7);

      if (user.planType === 'TAPER_FREQ') {
        // Reducimos 1 peta permitido por cada semana
        const allowance = Math.max(0, baseDailyJoints - weeksPassed);
        // Tolerancia: si el allowance llega a 0, la dieta es 0. 
        // ¡Si fumas MÁS del allowance, la racha se rompe!
        if (stats.joints > allowance) {
          brokenDates.push(stats.ms);
        }
      } else if (user.planType === 'TAPER_GRAMS') {
        // Reducimos 0.1g permitido por cada semana (hasta 0)
        const allowancePerJoint = Math.max(0, baseGramsPerJoint - (0.1 * weeksPassed));
        // Comparamos el gramaje total vs el permitido teórico (allowance * petas fumados)
        const allowanceTotalToday = allowancePerJoint * Math.max(1, stats.joints);
        // Si ha fumado más gramos que la suma permitida (con 10% de margen de error de báscula)
        if (stats.grams > allowanceTotalToday * 1.1) {
          brokenDates.push(stats.ms);
        }
      }
    });

    if (brokenDates.length > 0) {
      mostRecentBrokenDate = new Date(Math.max(...brokenDates));
    }
  }

  if (mostRecentBrokenDate) {
    const smokeDiff = now - mostRecentBrokenDate;
    streak = Math.max(0, Math.floor(smokeDiff / (1000 * 60 * 60 * 24)));
  }

  return streak;
}

module.exports = { calculateStreak };
