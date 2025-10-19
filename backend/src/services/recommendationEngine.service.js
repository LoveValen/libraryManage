const prisma = require('../utils/prisma');
const { logger } = require('../utils/logger');
const tf = require('@tensorflow/tfjs-node');

/**
 * 推荐引擎服务 - 核心推荐算法实现
 */
class RecommendationEngine {
  constructor() {
    this.algorithms = new Map();
    this.models = new Map();
    this.isInitialized = false;
    this.performanceMetrics = {
      totalRecommendations: 0,
      averageLatency: 0,
      hitRate: 0,
      diversity: 0
    };
  }

  /**
   * 初始化推荐引擎
   */
  async initialize() {
    try {
      logger.info('🤖 初始化推荐引擎...');
      
      // 注册算法
      this.registerAlgorithms();
      
      // 加载训练好的模型
      await this.loadModels();
      
      // 预热推荐系统
      await this.warmUp();
      
      this.isInitialized = true;
      logger.info('✅ 推荐引擎初始化完成');
    } catch (error) {
      logger.error('❌ 推荐引擎初始化失败:', error);
      throw error;
    }
  }

  /**
   * 注册推荐算法
   */
  registerAlgorithms() {
    // 协同过滤算法
    this.algorithms.set('collaborative_filtering', {
      userBased: this.userBasedCollaborativeFiltering.bind(this),
      itemBased: this.itemBasedCollaborativeFiltering.bind(this),
      matrixFactorization: this.matrixFactorization.bind(this)
    });
    
    // 基于内容的过滤
    this.algorithms.set('content_based', {
      textSimilarity: this.contentBasedFiltering.bind(this),
      featureBased: this.featureBasedFiltering.bind(this),
      semantic: this.semanticContentFiltering.bind(this)
    });
    
    // 混合推荐
    this.algorithms.set('hybrid', {
      weightedHybrid: this.weightedHybridRecommendation.bind(this),
      switchingHybrid: this.switchingHybridRecommendation.bind(this),
      mixedHybrid: this.mixedHybridRecommendation.bind(this)
    });
    
    // 深度学习算法
    this.algorithms.set('deep_learning', {
      neuralCollaborative: this.neuralCollaborativeFiltering.bind(this),
      autoencoder: this.autoencoderRecommendation.bind(this),
      wideAndDeep: this.wideAndDeepRecommendation.bind(this)
    });
    
    // 基于知识的推荐
    this.algorithms.set('knowledge_based', {
      popular: this.popularityBasedRecommendation.bind(this),
      trending: this.trendingRecommendation.bind(this),
      demographic: this.demographicRecommendation.bind(this)
    });
    
    // 上下文感知推荐
    this.algorithms.set('contextual', {
      timeAware: this.timeAwareRecommendation.bind(this),
      locationBased: this.locationBasedRecommendation.bind(this),
      moodBased: this.moodBasedRecommendation.bind(this)
    });
    
    // 序列推荐
    this.algorithms.set('sequential', {
      sessionBased: this.sessionBasedRecommendation.bind(this),
      rnn: this.rnnSequentialRecommendation.bind(this),
      markovChain: this.markovChainRecommendation.bind(this)
    });
    
    logger.info(`✅ 注册了 ${this.algorithms.size} 个推荐算法类别`);
  }

  /**
   * 加载预训练模型
   */
  async loadModels() {
    try {
      const trainedModels = await models.RecommendationModel.findAll({
        where: {
          enabled: true,
          trainingStatus: 'trained'
        }
      });
      
      for (const modelConfig of trainedModels) {
        if (modelConfig.modelPath) {
          try {
            // 根据模型类型加载不同的模型
            switch (modelConfig.type) {
              case 'matrix_factorization':
                await this.loadMatrixFactorizationModel(modelConfig);
                break;
              case 'deep_learning':
                await this.loadDeepLearningModel(modelConfig);
                break;
              case 'neural_collaborative':
                await this.loadNeuralCollaborativeModel(modelConfig);
                break;
            }
            
            logger.info(`✅ 加载模型: ${modelConfig.name}`);
          } catch (error) {
            logger.warn(`⚠️ 模型加载失败 [${modelConfig.name}]:`, error.message);
          }
        }
      }
    } catch (error) {
      logger.error('模型加载过程中出错:', error);
    }
  }

  /**
   * 生成推荐
   */
  async generateRecommendations(userId, options = {}) {
    const startTime = Date.now();
    
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      const {
        scenario = 'homepage',
        algorithm = 'auto',
        limit = 10,
        diversityFactor = 0.3,
        includeExplanations = true,
        excludeBooks = [],
        contextInfo = {}
      } = options;
      
      // 获取用户偏好和历史
      const userPreference = await models.UserPreference.findOrCreateForUser(userId);
      const userHistory = await this.getUserHistory(userId);
      
      // 选择推荐算法
      const selectedAlgorithm = await this.selectAlgorithm(userId, scenario, algorithm, userPreference);
      
      // 生成候选推荐
      const candidates = await this.generateCandidates(userId, selectedAlgorithm, userHistory, contextInfo, limit * 3);
      
      // 过滤和排序
      const filtered = await this.filterCandidates(candidates, excludeBooks, userId);
      const ranked = await this.rankCandidates(filtered, userPreference, diversityFactor);
      
      // 应用多样性
      const diversified = await this.applyDiversification(ranked, diversityFactor, limit);
      
      // 生成解释
      const recommendations = includeExplanations ? 
        await this.generateExplanations(diversified, userPreference) : 
        diversified;
      
      // 记录推荐结果
      await this.recordRecommendations(userId, recommendations, selectedAlgorithm, scenario);
      
      // 更新性能指标
      const latency = Date.now() - startTime;
      this.updatePerformanceMetrics(latency, recommendations.length);
      
      logger.info(`✅ 为用户 ${userId} 生成了 ${recommendations.length} 个推荐 (${latency}ms)`);
      
      return {
        recommendations: recommendations.slice(0, limit),
        algorithm: selectedAlgorithm.name,
        totalCandidates: candidates.length,
        processingTime: latency,
        diversity: this.calculateDiversity(recommendations),
        metadata: {
          scenario,
          userProfile: userPreference.userProfile,
          context: contextInfo
        }
      };
      
    } catch (error) {
      logger.error(`推荐生成失败 [用户: ${userId}]:`, error);
      
      // 降级到流行度推荐
      const fallbackRecommendations = await this.getFallbackRecommendations(userId, options);
      
      return {
        recommendations: fallbackRecommendations,
        algorithm: 'fallback_popular',
        error: error.message,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * 选择推荐算法
   */
  async selectAlgorithm(userId, scenario, algorithmPreference, userPreference) {
    if (algorithmPreference !== 'auto') {
      const algorithm = await models.RecommendationModel.findOne({
        where: { name: algorithmPreference, enabled: true }
      });
      if (algorithm) return algorithm;
    }
    
    // 基于用户状态选择算法
    if (userPreference.coldStartInfo.is_cold_start) {
      return await this.selectColdStartAlgorithm(scenario);
    }
    
    // 基于场景选择算法
    const algorithms = await models.RecommendationModel.getAvailable(scenario);
    
    if (algorithms.length === 0) {
      return await models.RecommendationModel.getDefault();
    }
    
    // A/B测试选择
    const selectedAlgorithm = await this.performABTest(userId, algorithms);
    
    return selectedAlgorithm || algorithms[0];
  }

  /**
   * 基于用户的协同过滤
   */
  async userBasedCollaborativeFiltering(userId, limit = 50) {
    try {
      // 获取用户行为数据
      const userBehaviors = await models.UserBehavior.findAll({
        where: { userId },
        include: [{ model: models.Book, as: 'book' }]
      });
      
      if (userBehaviors.length < 5) {
        return []; // 数据不足
      }
      
      // 构建用户-物品矩阵
      const userItemMatrix = await this.buildUserItemMatrix();
      
      // 找到相似用户
      const similarUsers = await this.findSimilarUsers(userId, userItemMatrix, 50);
      
      // 生成推荐
      const recommendations = [];
      const userBooks = new Set(userBehaviors.map(b => b.bookId));
      
      for (const similarUser of similarUsers) {
        if (recommendations.length >= limit) break;
        
        const similarUserBehaviors = await models.UserBehavior.findAll({
          where: { 
            userId: similarUser.userId,
            bookId: { [models.sequelize.Op.notIn]: Array.from(userBooks) }
          },
          include: [{ model: models.Book, as: 'book' }],
          order: [['intensity', 'DESC']],
          limit: 10
        });
        
        for (const behavior of similarUserBehaviors) {
          if (recommendations.length >= limit) break;
          
          const score = behavior.intensity * similarUser.similarity;
          recommendations.push({
            bookId: behavior.bookId,
            book: behavior.book,
            score,
            algorithm: 'user_based_cf',
            explanation: `与您相似的用户也喜欢这本书 (相似度: ${similarUser.similarity.toFixed(2)})`
          });
        }
      }
      
      return recommendations.sort((a, b) => b.score - a.score);
      
    } catch (error) {
      logger.error('基于用户的协同过滤失败:', error);
      return [];
    }
  }

  /**
   * 基于物品的协同过滤
   */
  async itemBasedCollaborativeFiltering(userId, limit = 50) {
    try {
      // 获取用户喜欢的图书
      const userLikedBooks = await models.UserBehavior.findAll({
        where: { 
          userId,
          intensity: { [models.sequelize.Op.gte]: 2.0 }
        },
        include: [{ model: models.Book, as: 'book' }],
        order: [['intensity', 'DESC']],
        limit: 20
      });
      
      if (userLikedBooks.length === 0) {
        return [];
      }
      
      const recommendations = [];
      const userBookIds = new Set(userLikedBooks.map(b => b.bookId));
      
      for (const likedBook of userLikedBooks) {
        // 找到相似的图书
        const similarBooks = await this.findSimilarBooks(likedBook.bookId, 10);
        
        for (const similarBook of similarBooks) {
          if (userBookIds.has(similarBook.bookId)) continue;
          if (recommendations.some(r => r.bookId === similarBook.bookId)) continue;
          
          const score = likedBook.intensity * similarBook.similarity;
          recommendations.push({
            bookId: similarBook.bookId,
            book: similarBook.book,
            score,
            algorithm: 'item_based_cf',
            explanation: `因为您喜欢《${likedBook.book.title}》`
          });
        }
      }
      
      return recommendations
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
        
    } catch (error) {
      logger.error('基于物品的协同过滤失败:', error);
      return [];
    }
  }

  /**
   * 基于内容的过滤
   */
  async contentBasedFiltering(userId, limit = 50) {
    try {
      const userPreference = await models.UserPreference.findOrCreateForUser(userId);
      const weights = userPreference.getRecommendationWeights();
      
      // 构建查询条件
      const whereConditions = {};
      const orderConditions = [];
      
      // 基于分类偏好
      if (weights.category && Object.keys(weights.category).length > 0) {
        const preferredCategories = Object.entries(weights.category)
          .filter(([, score]) => score > 0.3)
          .map(([category]) => category);
        
        if (preferredCategories.length > 0) {
          whereConditions.category = { [models.sequelize.Op.in]: preferredCategories };
        }
      }
      
      // 排除用户已交互的图书
      const userBookIds = await models.UserBehavior.findAll({
        where: { userId },
        attributes: ['bookId'],
        raw: true
      }).then(behaviors => behaviors.map(b => b.bookId));
      
      if (userBookIds.length > 0) {
        whereConditions.id = { [models.sequelize.Op.notIn]: userBookIds };
      }
      
      // 查询候选图书
      const candidateBooks = await models.Book.findAll({
        where: whereConditions,
        limit: limit * 2
      });
      
      // 计算内容相似度分数
      const recommendations = candidateBooks.map(book => {
        const score = userPreference.calculateContentScore(book);
        return {
          bookId: book.id,
          book,
          score,
          algorithm: 'content_based',
          explanation: this.generateContentBasedExplanation(book, weights)
        };
      });
      
      return recommendations
        .filter(r => r.score > 0.1)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
        
    } catch (error) {
      logger.error('基于内容的过滤失败:', error);
      return [];
    }
  }

  /**
   * 混合推荐算法
   */
  async weightedHybridRecommendation(userId, limit = 50) {
    try {
      // 获取不同算法的推荐结果
      const [cfRecommendations, contentRecommendations, popularRecommendations] = await Promise.all([
        this.userBasedCollaborativeFiltering(userId, limit),
        this.contentBasedFiltering(userId, limit),
        this.popularityBasedRecommendation(userId, limit)
      ]);
      
      // 设置权重
      const weights = {
        collaborative: 0.5,
        content: 0.3,
        popular: 0.2
      };
      
      // 合并和加权
      const bookScores = new Map();
      
      // 处理协同过滤结果
      cfRecommendations.forEach(rec => {
        const currentScore = bookScores.get(rec.bookId) || { score: 0, book: rec.book, sources: [] };
        currentScore.score += rec.score * weights.collaborative;
        currentScore.sources.push('collaborative');
        bookScores.set(rec.bookId, currentScore);
      });
      
      // 处理内容过滤结果
      contentRecommendations.forEach(rec => {
        const currentScore = bookScores.get(rec.bookId) || { score: 0, book: rec.book, sources: [] };
        currentScore.score += rec.score * weights.content;
        currentScore.sources.push('content');
        bookScores.set(rec.bookId, currentScore);
      });
      
      // 处理流行度结果
      popularRecommendations.forEach(rec => {
        const currentScore = bookScores.get(rec.bookId) || { score: 0, book: rec.book, sources: [] };
        currentScore.score += rec.score * weights.popular;
        currentScore.sources.push('popular');
        bookScores.set(rec.bookId, currentScore);
      });
      
      // 转换为推荐列表
      const hybridRecommendations = Array.from(bookScores.entries()).map(([bookId, data]) => ({
        bookId: parseInt(bookId),
        book: data.book,
        score: data.score,
        algorithm: 'weighted_hybrid',
        explanation: `基于${data.sources.join('、')}多重算法推荐`
      }));
      
      return hybridRecommendations
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
        
    } catch (error) {
      logger.error('混合推荐算法失败:', error);
      return [];
    }
  }

  /**
   * 流行度推荐
   */
  async popularityBasedRecommendation(userId, limit = 50) {
    try {
      // 获取用户已交互的图书
      const userBookIds = await models.UserBehavior.findAll({
        where: { userId },
        attributes: ['bookId'],
        raw: true
      }).then(behaviors => behaviors.map(b => b.bookId));
      
      // 获取热门图书统计
      const popularBooks = await models.UserBehavior.findAll({
        where: {
          bookId: { [models.sequelize.Op.notIn]: userBookIds },
          createdAt: {
            [models.sequelize.Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30天内
          }
        },
        attributes: [
          'bookId',
          [models.sequelize.fn('COUNT', models.sequelize.col('id')), 'interactionCount'],
          [models.sequelize.fn('AVG', models.sequelize.col('intensity')), 'avgIntensity'],
          [models.sequelize.fn('COUNT', models.sequelize.fn('DISTINCT', models.sequelize.col('userId'))), 'uniqueUsers']
        ],
        include: [{ model: models.Book, as: 'book' }],
        group: ['bookId', 'book.id'],
        order: [
          [models.sequelize.fn('COUNT', models.sequelize.col('id')), 'DESC'],
          [models.sequelize.fn('AVG', models.sequelize.col('intensity')), 'DESC']
        ],
        limit
      });
      
      return popularBooks.map((item, index) => ({
        bookId: item.bookId,
        book: item.book,
        score: Math.max(0.1, 1.0 - (index * 0.02)), // 递减分数
        algorithm: 'popularity_based',
        explanation: `热门推荐 (${item.dataValues.uniqueUsers} 位用户喜欢)`
      }));
      
    } catch (error) {
      logger.error('流行度推荐失败:', error);
      return [];
    }
  }

  /**
   * 趋势推荐
   */
  async trendingRecommendation(userId, limit = 50) {
    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      
      // 获取用户已交互的图书
      const userBookIds = await models.UserBehavior.findAll({
        where: { userId },
        attributes: ['bookId'],
        raw: true
      }).then(behaviors => behaviors.map(b => b.bookId));
      
      // 计算趋势分数（最近7天 vs 前7天的互动增长率）
      const trendingBooks = await models.sequelize.query(`
        WITH recent_stats AS (
          SELECT 
            book_id,
            COUNT(*) as recent_count,
            COUNT(DISTINCT user_id) as recent_users
          FROM user_behaviors 
          WHERE created_at >= :sevenDaysAgo 
            AND book_id NOT IN (:userBookIds)
          GROUP BY book_id
        ),
        previous_stats AS (
          SELECT 
            book_id,
            COUNT(*) as previous_count,
            COUNT(DISTINCT user_id) as previous_users
          FROM user_behaviors 
          WHERE created_at >= :fourteenDaysAgo 
            AND created_at < :sevenDaysAgo
            AND book_id NOT IN (:userBookIds)
          GROUP BY book_id
        )
        SELECT 
          r.book_id,
          r.recent_count,
          r.recent_users,
          COALESCE(p.previous_count, 0) as previous_count,
          CASE 
            WHEN COALESCE(p.previous_count, 0) = 0 THEN r.recent_count * 2
            ELSE (r.recent_count::float / p.previous_count) - 1
          END as trend_score
        FROM recent_stats r
        LEFT JOIN previous_stats p ON r.book_id = p.book_id
        WHERE r.recent_count >= 3
        ORDER BY trend_score DESC, r.recent_count DESC
        LIMIT :limit
      `, {
        replacements: {
          sevenDaysAgo,
          fourteenDaysAgo,
          userBookIds: userBookIds.length > 0 ? userBookIds : [0],
          limit
        },
        type: models.sequelize.QueryTypes.SELECT
      });
      
      // 获取图书详情
      const bookIds = trendingBooks.map(item => item.book_id);
      const books = await models.Book.findAll({
        where: { id: bookIds }
      });
      
      const bookMap = new Map(books.map(book => [book.id, book]));
      
      return trendingBooks.map((item, index) => ({
        bookId: item.book_id,
        book: bookMap.get(item.book_id),
        score: Math.max(0.1, Math.min(1.0, item.trend_score / 2)),
        algorithm: 'trending',
        explanation: `上升趋势 (${item.recent_users} 位用户最近关注)`
      }));
      
    } catch (error) {
      logger.error('趋势推荐失败:', error);
      return [];
    }
  }

  /**
   * 深度学习推荐 (简化版神经协同过滤)
   */
  async neuralCollaborativeFiltering(userId, limit = 50) {
    try {
      // 这里实现一个简化的神经协同过滤
      // 在实际项目中，这里会加载预训练的深度学习模型
      
      // 获取用户嵌入向量和物品嵌入向量
      const userEmbedding = await this.getUserEmbedding(userId);
      const itemEmbeddings = await this.getItemEmbeddings();
      
      if (!userEmbedding || !itemEmbeddings) {
        return [];
      }
      
      // 计算相似度分数
      const scores = itemEmbeddings.map(item => ({
        bookId: item.bookId,
        book: item.book,
        score: this.cosineSimilarity(userEmbedding, item.embedding),
        algorithm: 'neural_cf',
        explanation: '基于深度学习模型的个性化推荐'
      }));
      
      return scores
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
        
    } catch (error) {
      logger.error('神经协同过滤失败:', error);
      return [];
    }
  }

  /**
   * 生成候选推荐
   */
  async generateCandidates(userId, algorithm, userHistory, contextInfo, limit) {
    const algorithmType = algorithm.type;
    const algorithmConfig = algorithm.config;
    
    let candidates = [];
    
    try {
      switch (algorithmType) {
        case 'collaborative_filtering':
          if (algorithmConfig.userBasedCF) {
            const userBasedResults = await this.userBasedCollaborativeFiltering(userId, limit);
            candidates = candidates.concat(userBasedResults);
          }
          if (algorithmConfig.itemBasedCF) {
            const itemBasedResults = await this.itemBasedCollaborativeFiltering(userId, limit);
            candidates = candidates.concat(itemBasedResults);
          }
          break;
          
        case 'content_based':
          candidates = await this.contentBasedFiltering(userId, limit);
          break;
          
        case 'hybrid':
          candidates = await this.weightedHybridRecommendation(userId, limit);
          break;
          
        case 'knowledge_based':
          const popularResults = await this.popularityBasedRecommendation(userId, limit / 2);
          const trendingResults = await this.trendingRecommendation(userId, limit / 2);
          candidates = popularResults.concat(trendingResults);
          break;
          
        case 'deep_learning':
          candidates = await this.neuralCollaborativeFiltering(userId, limit);
          break;
          
        default:
          // 默认使用混合算法
          candidates = await this.weightedHybridRecommendation(userId, limit);
      }
      
      // 应用上下文信息
      if (contextInfo && Object.keys(contextInfo).length > 0) {
        candidates = await this.applyContextualFiltering(candidates, contextInfo);
      }
      
    } catch (error) {
      logger.error(`算法 ${algorithmType} 执行失败:`, error);
      // 降级到流行度推荐
      candidates = await this.popularityBasedRecommendation(userId, limit);
    }
    
    return candidates;
  }

  /**
   * 过滤候选推荐
   */
  async filterCandidates(candidates, excludeBooks, userId) {
    const excludeSet = new Set(excludeBooks);
    
    // 获取用户的负面偏好
    const userPreference = await models.UserPreference.findOrCreateForUser(userId);
    const negativePrefs = userPreference.negativePreferences || {};
    
    return candidates.filter(candidate => {
      // 排除指定的图书
      if (excludeSet.has(candidate.bookId)) {
        return false;
      }
      
      // 检查负面偏好
      if (negativePrefs.disliked_categories?.includes(candidate.book.category)) {
        return false;
      }
      
      if (negativePrefs.disliked_authors?.includes(candidate.book.author)) {
        return false;
      }
      
      // 检查内容过滤器
      if (negativePrefs.blacklisted_keywords?.some(keyword => 
        candidate.book.title.toLowerCase().includes(keyword.toLowerCase()) ||
        candidate.book.description?.toLowerCase().includes(keyword.toLowerCase())
      )) {
        return false;
      }
      
      // 最低分数阈值
      if (candidate.score < 0.05) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * 候选推荐排序
   */
  async rankCandidates(candidates, userPreference, diversityFactor) {
    // 应用个性化强度
    const personalizedCandidates = candidates.map(candidate => ({
      ...candidate,
      score: candidate.score * userPreference.personalizationStrength + 
             candidate.score * (1 - userPreference.personalizationStrength) * 0.5 // 平均分
    }));
    
    return personalizedCandidates.sort((a, b) => b.score - a.score);
  }

  /**
   * 应用多样性算法
   */
  async applyDiversification(candidates, diversityFactor, limit) {
    if (diversityFactor <= 0 || candidates.length <= limit) {
      return candidates.slice(0, limit);
    }
    
    const diversified = [];
    const remaining = [...candidates];
    const categories = new Set();
    const authors = new Set();
    
    while (diversified.length < limit && remaining.length > 0) {
      let selectedIndex = 0;
      
      if (diversified.length > 0 && Math.random() < diversityFactor) {
        // 选择多样性候选
        for (let i = 0; i < remaining.length; i++) {
          const candidate = remaining[i];
          const categoryDiverse = !categories.has(candidate.book.category);
          const authorDiverse = !authors.has(candidate.book.author);
          
          if (categoryDiverse || authorDiverse) {
            selectedIndex = i;
            break;
          }
        }
      }
      
      const selected = remaining.splice(selectedIndex, 1)[0];
      diversified.push(selected);
      categories.add(selected.book.category);
      authors.add(selected.book.author);
    }
    
    return diversified;
  }

  /**
   * 生成推荐解释
   */
  async generateExplanations(recommendations, userPreference) {
    return recommendations.map(rec => {
      if (rec.explanation) {
        return rec; // 已有解释
      }
      
      // 基于算法类型生成通用解释
      const explanations = {
        'user_based_cf': '因为与您兴趣相似的用户也喜欢',
        'item_based_cf': '基于您的阅读历史推荐',
        'content_based': '根据您的偏好推荐',
        'popularity_based': '热门图书推荐',
        'trending': '正在上升的热门图书',
        'weighted_hybrid': '基于多重算法的个性化推荐',
        'neural_cf': '基于AI智能分析推荐'
      };
      
      return {
        ...rec,
        explanation: explanations[rec.algorithm] || '系统推荐'
      };
    });
  }

  /**
   * 记录推荐结果
   */
  async recordRecommendations(userId, recommendations, algorithm, scenario) {
    try {
      const batchId = `batch_${Date.now()}_${userId}`;
      
      const recommendationRecords = recommendations.map((rec, index) => ({
        userId,
        bookId: rec.bookId,
        modelId: algorithm.id,
        algorithm: algorithm.name,
        score: rec.score,
        rank: index + 1,
        recommendationType: this.getRecommendationType(rec.algorithm),
        scenario,
        explanation: {
          primary_reason: rec.explanation,
          algorithm_type: rec.algorithm,
          confidence_level: rec.score
        },
        batchId
      }));
      
      await models.Recommendation.createBatch(recommendationRecords, batchId);
      
    } catch (error) {
      logger.error('记录推荐结果失败:', error);
    }
  }

  /**
   * 获取推荐类型
   */
  getRecommendationType(algorithm) {
    const typeMapping = {
      'user_based_cf': 'collaborative',
      'item_based_cf': 'collaborative',
      'content_based': 'content_based',
      'popularity_based': 'popular',
      'trending': 'trending',
      'weighted_hybrid': 'personalized',
      'neural_cf': 'personalized'
    };
    
    return typeMapping[algorithm] || 'personalized';
  }

  /**
   * 获取降级推荐
   */
  async getFallbackRecommendations(userId, options) {
    try {
      const { limit = 10 } = options;
      
      // 使用流行度推荐作为降级策略
      const fallback = await this.popularityBasedRecommendation(userId, limit);
      
      return fallback.map(rec => ({
        ...rec,
        algorithm: 'fallback_popular',
        explanation: '热门推荐'
      }));
      
    } catch (error) {
      logger.error('降级推荐失败:', error);
      return [];
    }
  }

  /**
   * 工具方法
   */
  
  async getUserHistory(userId) {
    return await models.UserBehavior.findAll({
      where: { userId },
      include: [{ model: models.Book, as: 'book' }],
      order: [['createdAt', 'DESC']],
      limit: 100
    });
  }

  async buildUserItemMatrix() {
    // 构建用户-物品评分矩阵的简化实现
    // 实际项目中这里会使用更高效的稀疏矩阵实现
    return new Map();
  }

  async findSimilarUsers(userId, matrix, limit) {
    // 寻找相似用户的简化实现
    // 实际项目中会使用更复杂的相似度计算
    return [];
  }

  async findSimilarBooks(bookId, limit) {
    // 寻找相似图书的简化实现
    return [];
  }

  cosineSimilarity(vectorA, vectorB) {
    if (!vectorA || !vectorB || vectorA.length !== vectorB.length) {
      return 0;
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      normA += vectorA[i] * vectorA[i];
      normB += vectorB[i] * vectorB[i];
    }
    
    if (normA === 0 || normB === 0) {
      return 0;
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  calculateDiversity(recommendations) {
    if (recommendations.length === 0) return 0;
    
    const categories = new Set(recommendations.map(r => r.book.category));
    const authors = new Set(recommendations.map(r => r.book.author));
    
    return (categories.size + authors.size) / (recommendations.length * 2);
  }

  updatePerformanceMetrics(latency, recommendationCount) {
    this.performanceMetrics.totalRecommendations += recommendationCount;
    this.performanceMetrics.averageLatency = 
      (this.performanceMetrics.averageLatency + latency) / 2;
  }

  async warmUp() {
    logger.info('🔥 预热推荐系统...');
    // 预加载一些常用数据到缓存
    // 实际项目中这里会预加载用户嵌入、物品嵌入等
  }

  // 占位符方法（实际项目中需要完整实现）
  async loadMatrixFactorizationModel(modelConfig) {}
  async loadDeepLearningModel(modelConfig) {}
  async loadNeuralCollaborativeModel(modelConfig) {}
  async getUserEmbedding(userId) { return null; }
  async getItemEmbeddings() { return []; }
  async applyContextualFiltering(candidates, contextInfo) { return candidates; }
  async selectColdStartAlgorithm(scenario) { return await models.RecommendationModel.getDefault(); }
  async performABTest(userId, algorithms) { return algorithms[0]; }
  generateContentBasedExplanation(book, weights) { return `基于您对${book.category}类图书的偏好`; }
}

// 创建单例实例
const recommendationEngine = new RecommendationEngine();

module.exports = recommendationEngine;