const { models } = require('../models');
const { Op } = require('sequelize');
const { 
  NotFoundError, 
  ConflictError, 
  BadRequestError,
  ValidationError,
  UnauthorizedError 
} = require('../utils/apiError');
const { logBusinessOperation } = require('../utils/logger');
const { BORROW_STATUS, BORROW_RULES, USER_ROLES } = require('../utils/constants');

/**
 * 借阅服务类
 * 处理图书借阅相关的业务逻辑
 */
class BorrowsService {
  /**
   * 创建借阅记录
   * @param {Object} borrowData - 借阅数据
   * @param {Object} operatorUser - 操作用户
   * @returns {Object} 创建的借阅记录
   */
  async createBorrow(borrowData, operatorUser) {
    const { userId, bookId, borrowDays = BORROW_RULES.DEFAULT_BORROW_DAYS } = borrowData;

    // 验证用户存在且可以借阅
    const user = await models.User.findByPk(userId);
    if (!user || !user.isActive()) {
      throw new BadRequestError('User not found or inactive');
    }

    if (!user.canBorrow()) {
      throw new BadRequestError('User is not allowed to borrow books');
    }

    // 验证图书存在且可以借阅
    const book = await models.Book.findByPk(bookId);
    if (!book || !book.isAvailable()) {
      throw new BadRequestError('Book not found or not available');
    }

    // 检查用户是否已经借阅了这本书
    const existingBorrow = await models.Borrow.findOne({
      where: {
        userId,
        bookId,
        status: { [require('sequelize').Op.in]: [BORROW_STATUS.BORROWED, BORROW_STATUS.OVERDUE] },
        isDeleted: false,
      },
    });

    if (existingBorrow) {
      throw new ConflictError('User has already borrowed this book');
    }

    // 检查用户当前借阅数量是否超限
    const activeBorrows = await models.Borrow.count({
      where: {
        userId,
        status: { [require('sequelize').Op.in]: [BORROW_STATUS.BORROWED, BORROW_STATUS.OVERDUE] },
        isDeleted: false,
      },
    });

    if (activeBorrows >= BORROW_RULES.MAX_BORROW_BOOKS) {
      throw new BadRequestError(`User has reached maximum borrow limit (${BORROW_RULES.MAX_BORROW_BOOKS} books)`);
    }

    // 检查用户是否有未支付的罚金
    const unpaidFines = await models.Borrow.sum('fine', {
      where: {
        userId,
        finePaid: false,
        fine: { [require('sequelize').Op.gt]: 0 },
        isDeleted: false,
      },
    });

    if (unpaidFines > 0) {
      throw new BadRequestError('User has unpaid fines that must be cleared before borrowing');
    }

    // 创建借阅记录
    const borrowToCreate = {
      userId,
      bookId,
      borrowDays,
      borrowDate: new Date(),
      processedBy: operatorUser.id,
      borrowLocation: 'Main Library', // 可以根据实际情况设置
      status: BORROW_STATUS.BORROWED,
    };

    const borrow = await models.Borrow.create(borrowToCreate);

    // 加载关联数据
    await borrow.reload({
      include: [
        {
          model: models.User,
          as: 'user',
          attributes: ['id', 'username', 'realName', 'email'],
        },
        {
          model: models.Book,
          as: 'book',
          attributes: ['id', 'title', 'authors', 'isbn', 'coverImage'],
        },
      ],
    });

    logBusinessOperation({
      operation: 'book_borrowed',
      userId: operatorUser.id,
      targetUserId: userId,
      details: {
        borrowId: borrow.id,
        bookId: book.id,
        bookTitle: book.title,
        dueDate: borrow.dueDate,
      },
    });

    return borrow;
  }

  /**
   * 获取借阅记录列表
   * @param {Object} filters - 过滤条件
   * @returns {Object} 借阅记录列表和分页信息
   */
  async getBorrowList(filters = {}) {
    const {
      page = 1,
      limit = 20,
      userId,
      bookId,
      status,
      isOverdue,
      startDate,
      endDate,
      sortBy = 'borrow_date',
      sortOrder = 'desc',
    } = filters;

    const offset = (page - 1) * limit;
    const { Op } = require('sequelize');

    // 构建查询条件
    const where = {
      isDeleted: false,
    };

    if (userId) where.userId = userId;
    if (bookId) where.bookId = bookId;
    if (status) where.status = status;
    
    if (isOverdue === true) {
      where.status = { [Op.in]: [BORROW_STATUS.OVERDUE] };
    } else if (isOverdue === false) {
      where.status = { [Op.notIn]: [BORROW_STATUS.OVERDUE] };
    }

    if (startDate) {
      where.borrowDate = { [Op.gte]: new Date(startDate) };
    }
    if (endDate) {
      where.borrowDate = where.borrowDate ? 
        { ...where.borrowDate, [Op.lte]: new Date(endDate) } : 
        { [Op.lte]: new Date(endDate) };
    }

    const result = await models.Borrow.findAndCountAll({
      where,
      include: [
        {
          model: models.User,
          as: 'user',
          attributes: ['id', 'username', 'realName', 'email', 'phone'],
        },
        {
          model: models.Book,
          as: 'book',
          attributes: ['id', 'title', 'authors', 'isbn', 'coverImage', 'category'],
        },
        {
          model: models.User,
          as: 'processedByUser',
          attributes: ['id', 'username', 'realName'],
          required: false,
        },
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // 计算实时逾期信息
    const borrowsWithOverdueInfo = result.rows.map(borrow => {
      const borrowData = borrow.toJSON();
      borrowData.isCurrentlyOverdue = borrow.isOverdue();
      borrowData.daysRemaining = borrow.getDaysRemaining();
      borrowData.currentOverdueDays = borrow.getOverdueDays();
      borrowData.canRenew = borrow.canRenew();
      return borrowData;
    });

    return {
      borrows: borrowsWithOverdueInfo,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.count,
        pages: Math.ceil(result.count / limit),
      },
    };
  }

  /**
   * 根据ID获取借阅记录详情
   * @param {number} borrowId - 借阅ID
   * @param {Object} operatorUser - 操作用户
   * @returns {Object} 借阅记录详情
   */
  async getBorrowById(borrowId, operatorUser) {
    const borrow = await models.Borrow.findOne({
      where: {
        id: borrowId,
        isDeleted: false,
      },
      include: [
        {
          model: models.User,
          as: 'user',
          attributes: ['id', 'username', 'realName', 'email', 'phone', 'avatar'],
        },
        {
          model: models.Book,
          as: 'book',
          attributes: ['id', 'title', 'authors', 'isbn', 'coverImage', 'category', 'publisher'],
        },
        {
          model: models.User,
          as: 'processedByUser',
          attributes: ['id', 'username', 'realName'],
          required: false,
        },
      ],
    });

    if (!borrow) {
      throw new NotFoundError('Borrow record not found');
    }

    // 检查权限：用户只能查看自己的借阅记录，管理员可以查看所有
    if (borrow.userId !== operatorUser.id && !operatorUser.isAdmin() && operatorUser.role !== USER_ROLES.LIBRARIAN) {
      throw new UnauthorizedError('You can only view your own borrow records');
    }

    const borrowData = borrow.toJSON();
    borrowData.isCurrentlyOverdue = borrow.isOverdue();
    borrowData.daysRemaining = borrow.getDaysRemaining();
    borrowData.currentOverdueDays = borrow.getOverdueDays();
    borrowData.canRenew = borrow.canRenew();

    return borrowData;
  }

  /**
   * 归还图书
   * @param {number} borrowId - 借阅ID
   * @param {Object} returnData - 归还数据
   * @param {Object} operatorUser - 操作用户
   * @returns {Object} 归还结果
   */
  async returnBook(borrowId, returnData = {}, operatorUser) {
    const { condition = 'good', notes = '', damageDescription = '' } = returnData;

    const borrow = await models.Borrow.findByPk(borrowId);
    if (!borrow) {
      throw new NotFoundError('Borrow record not found');
    }

    if (borrow.status === BORROW_STATUS.RETURNED) {
      throw new BadRequestError('Book has already been returned');
    }

    if (borrow.status === BORROW_STATUS.LOST) {
      throw new BadRequestError('Book is marked as lost and cannot be returned normally');
    }

    // 执行归还操作
    await borrow.returnBook(condition, notes, operatorUser.id);

    // 如果图书损坏，添加损坏描述
    if (condition === 'damaged' && damageDescription) {
      await borrow.update({ damageDescription });
    }

    // 加载关联数据
    await borrow.reload({
      include: [
        {
          model: models.User,
          as: 'user',
          attributes: ['id', 'username', 'realName', 'email'],
        },
        {
          model: models.Book,
          as: 'book',
          attributes: ['id', 'title', 'authors', 'isbn'],
        },
      ],
    });

    logBusinessOperation({
      operation: 'book_returned',
      userId: operatorUser.id,
      targetUserId: borrow.userId,
      details: {
        borrowId: borrow.id,
        bookId: borrow.bookId,
        condition,
        overdueDays: borrow.overdueDays,
        fine: borrow.fine,
      },
    });

    return borrow;
  }

  /**
   * 续借图书
   * @param {number} borrowId - 借阅ID
   * @param {Object} renewalData - 续借数据
   * @param {Object} operatorUser - 操作用户
   * @returns {Object} 续借结果
   */
  async renewBook(borrowId, renewalData = {}, operatorUser) {
    const { days = BORROW_RULES.RENEWAL_DAYS } = renewalData;

    const borrow = await models.Borrow.findByPk(borrowId);
    if (!borrow) {
      throw new NotFoundError('Borrow record not found');
    }

    // 检查权限：用户只能续借自己的书，管理员可以续借任何书
    if (borrow.userId !== operatorUser.id && !operatorUser.isAdmin() && operatorUser.role !== USER_ROLES.LIBRARIAN) {
      throw new UnauthorizedError('You can only renew your own borrows');
    }

    if (!borrow.canRenew()) {
      const reasons = [];
      if (borrow.status !== BORROW_STATUS.BORROWED) {
        reasons.push('book is not currently borrowed');
      }
      if (borrow.renewalCount >= borrow.maxRenewals) {
        reasons.push('maximum renewal limit reached');
      }
      if (borrow.isOverdue()) {
        reasons.push('book is overdue');
      }
      throw new BadRequestError(`Cannot renew: ${reasons.join(', ')}`);
    }

    // 执行续借操作
    await borrow.renew(days);

    // 加载关联数据
    await borrow.reload({
      include: [
        {
          model: models.User,
          as: 'user',
          attributes: ['id', 'username', 'realName', 'email'],
        },
        {
          model: models.Book,
          as: 'book',
          attributes: ['id', 'title', 'authors', 'isbn'],
        },
      ],
    });

    logBusinessOperation({
      operation: 'book_renewed',
      userId: operatorUser.id,
      targetUserId: borrow.userId,
      details: {
        borrowId: borrow.id,
        bookId: borrow.bookId,
        renewalCount: borrow.renewalCount,
        newDueDate: borrow.dueDate,
        daysExtended: days,
      },
    });

    return borrow;
  }

  /**
   * 标记图书为丢失
   * @param {number} borrowId - 借阅ID
   * @param {Object} lostData - 丢失数据
   * @param {Object} operatorUser - 操作用户
   * @returns {Object} 操作结果
   */
  async markBookAsLost(borrowId, lostData = {}, operatorUser) {
    const { notes = '' } = lostData;

    // 只有管理员和图书管理员可以标记图书为丢失
    if (!operatorUser.isAdmin() && operatorUser.role !== USER_ROLES.LIBRARIAN) {
      throw new UnauthorizedError('Only admins and librarians can mark books as lost');
    }

    const borrow = await models.Borrow.findByPk(borrowId);
    if (!borrow) {
      throw new NotFoundError('Borrow record not found');
    }

    if (borrow.status === BORROW_STATUS.RETURNED) {
      throw new BadRequestError('Cannot mark returned book as lost');
    }

    // 执行标记为丢失操作
    await borrow.markAsLost(notes, operatorUser.id);

    // 加载关联数据
    await borrow.reload({
      include: [
        {
          model: models.User,
          as: 'user',
          attributes: ['id', 'username', 'realName', 'email'],
        },
        {
          model: models.Book,
          as: 'book',
          attributes: ['id', 'title', 'authors', 'isbn'],
        },
      ],
    });

    logBusinessOperation({
      operation: 'book_marked_lost',
      userId: operatorUser.id,
      targetUserId: borrow.userId,
      details: {
        borrowId: borrow.id,
        bookId: borrow.bookId,
        notes,
      },
    });

    return borrow;
  }

  /**
   * 获取逾期借阅记录
   * @param {Object} filters - 过滤条件
   * @returns {Object} 逾期记录列表
   */
  async getOverdueRecords(filters = {}) {
    const { graceDays = BORROW_RULES.OVERDUE_GRACE_DAYS } = filters;

    const overdueRecords = await models.Borrow.getOverdueRecords(graceDays);

    // 计算实时逾期信息
    const recordsWithOverdueInfo = overdueRecords.map(borrow => {
      const borrowData = borrow.toJSON();
      borrowData.currentOverdueDays = borrow.getOverdueDays();
      return borrowData;
    });

    return recordsWithOverdueInfo;
  }

  /**
   * 获取逾期借阅记录（分页版本）
   * @param {Object} filters - 过滤条件
   * @returns {Object} 逾期记录列表和分页信息
   */
  async getOverdueRecordsPaginated(filters = {}) {
    const {
      page = 1,
      limit = 20,
      keyword = '',
      minOverdueDays = null,
      maxOverdueDays = null,
      sortBy = 'currentOverdueDays',
      sortOrder = 'desc'
    } = filters;

    // Convert empty strings to null for numeric parameters
    const cleanMinOverdueDays = minOverdueDays === '' ? null : minOverdueDays;
    const cleanMaxOverdueDays = maxOverdueDays === '' ? null : maxOverdueDays;
    const cleanKeyword = keyword === '' ? '' : keyword;

    const offset = (page - 1) * limit;

    // 构建查询条件
    const whereConditions = {
      status: {
        [Op.in]: [BORROW_STATUS.BORROWED, BORROW_STATUS.OVERDUE],
      },
      dueDate: {
        [Op.lt]: new Date(), // 已过期
      },
      isDeleted: false,
    };

    // 关键字搜索
    const includeConditions = [
      {
        model: models.User,
        as: 'user',
        attributes: ['id', 'username', 'email', 'realName'],
        where: cleanKeyword ? {
          [Op.or]: [
            { username: { [Op.like]: `%${cleanKeyword}%` } },
            { realName: { [Op.like]: `%${cleanKeyword}%` } },
            { email: { [Op.like]: `%${cleanKeyword}%` } },
          ]
        } : undefined,
      },
      {
        model: models.Book,
        as: 'book',
        attributes: ['id', 'title', 'authors', 'isbn'],
        where: cleanKeyword ? {
          [Op.or]: [
            { title: { [Op.like]: `%${cleanKeyword}%` } },
            { authors: { [Op.like]: `%${cleanKeyword}%` } },
            { isbn: { [Op.like]: `%${cleanKeyword}%` } },
          ]
        } : undefined,
      },
    ];

    // 获取所有记录（用于计算逾期天数过滤）
    const allRecords = await models.Borrow.findAll({
      where: whereConditions,
      include: includeConditions,
      raw: false,
    });

    // 计算逾期天数并过滤
    const recordsWithOverdueInfo = allRecords.map(borrow => {
      const borrowData = borrow.toJSON();
      borrowData.currentOverdueDays = borrow.getOverdueDays();
      return borrowData;
    }).filter(record => {
      const days = record.currentOverdueDays;
      if (cleanMinOverdueDays !== null && days < cleanMinOverdueDays) return false;
      if (cleanMaxOverdueDays !== null && days > cleanMaxOverdueDays) return false;
      return true;
    });

    // 排序
    recordsWithOverdueInfo.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'currentOverdueDays':
          aValue = a.currentOverdueDays;
          bValue = b.currentOverdueDays;
          break;
        case 'borrowDate':
          aValue = new Date(a.borrowDate);
          bValue = new Date(b.borrowDate);
          break;
        case 'dueDate':
          aValue = new Date(a.dueDate);
          bValue = new Date(b.dueDate);
          break;
        case 'userName':
          aValue = a.user?.realName || a.user?.username || '';
          bValue = b.user?.realName || b.user?.username || '';
          break;
        case 'bookTitle':
          aValue = a.book?.title || '';
          bValue = b.book?.title || '';
          break;
        default:
          aValue = a.currentOverdueDays;
          bValue = b.currentOverdueDays;
      }

      if (sortOrder === 'desc') {
        return bValue > aValue ? 1 : bValue < aValue ? -1 : 0;
      } else {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      }
    });

    // 分页
    const total = recordsWithOverdueInfo.length;
    const paginatedRecords = recordsWithOverdueInfo.slice(offset, offset + limit);

    // 统计信息
    const statistics = {
      total,
      mild: recordsWithOverdueInfo.filter(r => r.currentOverdueDays <= 3).length,
      moderate: recordsWithOverdueInfo.filter(r => r.currentOverdueDays > 3 && r.currentOverdueDays <= 7).length,
      severe: recordsWithOverdueInfo.filter(r => r.currentOverdueDays > 7 && r.currentOverdueDays <= 30).length,
      extreme: recordsWithOverdueInfo.filter(r => r.currentOverdueDays > 30).length,
    };

    return {
      records: paginatedRecords,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
      statistics,
    };
  }

  /**
   * 获取即将到期的借阅记录
   * @param {Object} filters - 过滤条件
   * @returns {Object} 即将到期记录列表
   */
  async getDueSoonRecords(filters = {}) {
    const { reminderDays = 3 } = filters;

    const dueSoonRecords = await models.Borrow.getDueSoonRecords(reminderDays);

    // 计算实时信息
    const recordsWithInfo = dueSoonRecords.map(borrow => {
      const borrowData = borrow.toJSON();
      borrowData.daysRemaining = borrow.getDaysRemaining();
      return borrowData;
    });

    return recordsWithInfo;
  }

  /**
   * 获取借阅统计信息
   * @returns {Object} 统计信息
   */
  async getBorrowStatistics() {
    const statistics = await models.Borrow.getStatistics();

    // 获取今日借阅和归还数量
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayBorrows = await models.Borrow.count({
      where: {
        borrowDate: {
          [require('sequelize').Op.between]: [today, tomorrow],
        },
        isDeleted: false,
      },
    });

    const todayReturns = await models.Borrow.count({
      where: {
        returnDate: {
          [require('sequelize').Op.between]: [today, tomorrow],
        },
        isDeleted: false,
      },
    });

    return {
      ...statistics,
      todayBorrows,
      todayReturns,
    };
  }

  /**
   * 批量处理借阅记录
   * @param {Array} borrowIds - 借阅ID列表
   * @param {string} action - 操作类型
   * @param {Object} params - 操作参数
   * @param {Object} operatorUser - 操作用户
   * @returns {Object} 操作结果
   */
  async batchProcessBorrows(borrowIds, action, params, operatorUser) {
    // 只有管理员和图书管理员可以批量处理
    if (!operatorUser.isAdmin() && operatorUser.role !== USER_ROLES.LIBRARIAN) {
      throw new UnauthorizedError('Only admins and librarians can perform batch operations');
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (const borrowId of borrowIds) {
      try {
        const borrow = await models.Borrow.findOne({
          where: { id: borrowId, isDeleted: false },
        });

        if (!borrow) {
          throw new NotFoundError(`Borrow record with ID ${borrowId} not found`);
        }

        switch (action) {
          case 'return':
            if (borrow.status !== BORROW_STATUS.RETURNED) {
              await this.returnBook(borrowId, params, operatorUser);
            }
            break;
          case 'renew':
            if (borrow.canRenew()) {
              await this.renewBook(borrowId, params, operatorUser);
            } else {
              throw new BadRequestError('Cannot renew this borrow');
            }
            break;
          case 'markLost':
            await this.markBookAsLost(borrowId, params, operatorUser);
            break;
          case 'sendReminder':
            // 这里可以实现发送提醒的逻辑
            await borrow.addNotificationRecord('batch_reminder');
            break;
          default:
            throw new BadRequestError(`Unknown action: ${action}`);
        }

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          borrowId,
          error: error.message,
        });
      }
    }

    logBusinessOperation({
      operation: 'borrows_batch_process',
      userId: operatorUser.id,
      details: {
        action,
        totalBorrows: borrowIds.length,
        successCount: results.success,
        failedCount: results.failed,
      },
    });

    return results;
  }

  /**
   * 获取用户借阅历史
   * @param {number} userId - 用户ID
   * @param {Object} filters - 过滤条件
   * @param {Object} operatorUser - 操作用户
   * @returns {Object} 借阅历史
   */
  async getUserBorrowHistory(userId, filters = {}, operatorUser) {
    // 检查权限：用户只能查看自己的借阅历史，管理员可以查看任何人的
    if (userId !== operatorUser.id && !operatorUser.isAdmin() && operatorUser.role !== USER_ROLES.LIBRARIAN) {
      throw new UnauthorizedError('You can only view your own borrow history');
    }

    const {
      page = 1,
      limit = 20,
      status,
      startDate,
      endDate,
    } = filters;

    const offset = (page - 1) * limit;
    const { Op } = require('sequelize');

    const where = { userId, isDeleted: false };

    if (status) where.status = status;
    if (startDate) {
      where.borrowDate = { [Op.gte]: new Date(startDate) };
    }
    if (endDate) {
      where.borrowDate = where.borrowDate ? 
        { ...where.borrowDate, [Op.lte]: new Date(endDate) } : 
        { [Op.lte]: new Date(endDate) };
    }

    const result = await models.Borrow.findAndCountAll({
      where,
      include: [
        {
          model: models.Book,
          as: 'book',
          attributes: ['id', 'title', 'authors', 'isbn', 'coverImage', 'category'],
        },
      ],
      order: [['borrowDate', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // 计算实时信息
    const borrowsWithInfo = result.rows.map(borrow => {
      const borrowData = borrow.toJSON();
      borrowData.isCurrentlyOverdue = borrow.isOverdue();
      borrowData.daysRemaining = borrow.getDaysRemaining();
      borrowData.currentOverdueDays = borrow.getOverdueDays();
      borrowData.canRenew = borrow.canRenew();
      return borrowData;
    });

    return {
      borrows: borrowsWithInfo,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.count,
        pages: Math.ceil(result.count / limit),
      },
    };
  }

  /**
   * 检查用户借阅限制
   * @param {number} userId - 用户ID
   * @returns {Object} 借阅限制信息
   */
  async checkBorrowLimits(userId) {
    const user = await models.User.findByPk(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const activeBorrows = await models.Borrow.getActiveByUser(userId);
    const unpaidFines = await models.Borrow.sum('fine', {
      where: {
        userId,
        finePaid: false,
        fine: { [require('sequelize').Op.gt]: 0 },
        isDeleted: false,
      },
    });

    const overdueBorrows = activeBorrows.filter(borrow => borrow.isOverdue());

    return {
      canBorrow: user.canBorrow() && activeBorrows.length < BORROW_RULES.MAX_BORROW_BOOKS && (unpaidFines || 0) === 0,
      activeBorrowCount: activeBorrows.length,
      maxBorrowLimit: BORROW_RULES.MAX_BORROW_BOOKS,
      unpaidFines: unpaidFines || 0,
      overdueBorrowCount: overdueBorrows.length,
      reasons: [],
    };
  }
}

module.exports = new BorrowsService();