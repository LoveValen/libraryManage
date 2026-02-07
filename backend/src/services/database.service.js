const prisma = require('../utils/prisma');

class DatabaseService {
  /**
   * Generic find many with pagination
   */
  static async findMany(model, options = {}) {
    const {
      where = {},
      orderBy = { createdAt: 'desc' },
      skip = 0,
      take = 10,
      include = {},
      select = undefined
    } = options;

    const [data, total] = await Promise.all([
      prisma[model].findMany({
        where,
        orderBy,
        skip,
        take,
        include,
        select
      }),
      prisma[model].count({ where })
    ]);

    return {
      data,
      total,
      page: Math.floor(skip / take) + 1,
      pageSize: take,
      totalPages: Math.ceil(total / take)
    };
  }

  /**
   * Find one record
   */
  static async findOne(model, options = {}) {
    const { where, include = {}, select = undefined } = options;
    return prisma[model].findFirst({
      where,
      include,
      select
    });
  }

  /**
   * Find by ID
   */
  static async findById(model, id, options = {}) {
    const { include = {}, select = undefined } = options;
    return prisma[model].findUnique({
      where: { id },
      include,
      select
    });
  }

  /**
   * Create a record
   */
  static async create(model, data, options = {}) {
    const { include = {}, select = undefined } = options;
    return prisma[model].create({
      data,
      include,
      select
    });
  }

  /**
   * Update a record
   */
  static async update(model, id, data, options = {}) {
    const { include = {}, select = undefined } = options;
    return prisma[model].update({
      where: { id },
      data,
      include,
      select
    });
  }

  /**
   * Update many records
   */
  static async updateMany(model, where, data) {
    return prisma[model].updateMany({
      where,
      data
    });
  }

  /**
   * Delete a record (soft delete if deleted_at field exists)
   */
  static async delete(model, id) {
    // Check if model has deleted_at field for soft delete
    const modelSchema = prisma[model].fields;
    if (modelSchema && modelSchema.deleted_at) {
      return prisma[model].update({
        where: { id },
        data: { deleted_at: new Date() }
      });
    }
    
    // Hard delete
    return prisma[model].delete({
      where: { id }
    });
  }

  /**
   * Delete many records
   */
  static async deleteMany(model, where) {
    return prisma[model].deleteMany({ where });
  }

  /**
   * Execute raw SQL query
   */
  static async raw(query, values = []) {
    return prisma.$queryRawUnsafe(query, ...values);
  }

  /**
   * Start a transaction
   */
  static async transaction(fn) {
    return prisma.$transaction(fn);
  }

  /**
   * Get database health status
   */
  static async checkHealth() {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: 'healthy', message: 'Database connection is active' };
    } catch (error) {
      return { status: 'unhealthy', message: error.message };
    }
  }
}

module.exports = DatabaseService;