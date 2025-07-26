require('dotenv').config();

const jwtConfig = {
  // JWT密钥
  secret: process.env.JWT_SECRET || 'your_jwt_secret_key_here_change_in_production',
  
  // 访问令牌过期时间
  expiresIn: process.env.JWT_EXPIRE || '7d',
  
  // 刷新令牌过期时间
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRE || '30d',
  
  // 发行者
  issuer: 'library-management-system',
  
  // 受众
  audience: 'library-users',
  
  // 算法
  algorithm: 'HS256',
  
  // 时钟容忍度（秒）
  clockTolerance: 10,
};

// 生成JWT选项
const generateTokenOptions = (payload, type = 'access') => {
  const options = {
    expiresIn: type === 'refresh' ? jwtConfig.refreshExpiresIn : jwtConfig.expiresIn,
    issuer: jwtConfig.issuer,
    audience: jwtConfig.audience,
    algorithm: jwtConfig.algorithm,
    subject: payload.userId ? payload.userId.toString() : undefined,
  };

  return options;
};

// 验证JWT选项
const verifyTokenOptions = {
  issuer: jwtConfig.issuer,
  audience: jwtConfig.audience,
  algorithms: [jwtConfig.algorithm],
  clockTolerance: jwtConfig.clockTolerance,
};

module.exports = {
  jwtConfig,
  generateTokenOptions,
  verifyTokenOptions,
};