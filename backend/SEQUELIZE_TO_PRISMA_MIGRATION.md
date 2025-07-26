# Sequelize to Prisma Migration Guide

This guide helps convert Sequelize queries to Prisma equivalents.

## Basic Queries

### Find All
```javascript
// Sequelize
const users = await User.findAll();

// Prisma
const users = await prisma.users.findMany();
```

### Find One
```javascript
// Sequelize
const user = await User.findOne({ where: { email } });

// Prisma
const user = await prisma.users.findFirst({ where: { email } });
// or
const user = await prisma.users.findUnique({ where: { email } });
```

### Find by Primary Key
```javascript
// Sequelize
const user = await User.findByPk(id);

// Prisma
const user = await prisma.users.findUnique({ where: { id } });
```

### Create
```javascript
// Sequelize
const user = await User.create({ name, email });

// Prisma
const user = await prisma.users.create({
  data: { name, email }
});
```

### Update
```javascript
// Sequelize
await User.update({ name }, { where: { id } });

// Prisma
await prisma.users.update({
  where: { id },
  data: { name }
});
```

### Delete
```javascript
// Sequelize
await User.destroy({ where: { id } });

// Prisma
await prisma.users.delete({ where: { id } });
```

## Advanced Queries

### Pagination
```javascript
// Sequelize
const users = await User.findAll({
  limit: 10,
  offset: 20,
  order: [['created_at', 'DESC']]
});

// Prisma
const users = await prisma.users.findMany({
  take: 10,
  skip: 20,
  orderBy: { created_at: 'desc' }
});
```

### Count
```javascript
// Sequelize
const count = await User.count({ where: { status: 'active' } });

// Prisma
const count = await prisma.users.count({ where: { status: 'active' } });
```

### Includes (Associations)
```javascript
// Sequelize
const users = await User.findAll({
  include: [
    { model: Post, as: 'posts' },
    { model: Profile, as: 'profile' }
  ]
});

// Prisma
const users = await prisma.users.findMany({
  include: {
    posts: true,
    profile: true
  }
});
```

### Complex Where Conditions
```javascript
// Sequelize
const users = await User.findAll({
  where: {
    [Op.or]: [
      { email: { [Op.like]: '%@example.com' } },
      { role: 'admin' }
    ],
    status: 'active',
    created_at: { [Op.gte]: new Date('2024-01-01') }
  }
});

// Prisma
const users = await prisma.users.findMany({
  where: {
    OR: [
      { email: { contains: '@example.com' } },
      { role: 'admin' }
    ],
    status: 'active',
    created_at: { gte: new Date('2024-01-01') }
  }
});
```

### Group By and Aggregate
```javascript
// Sequelize
const result = await User.findAll({
  attributes: [
    'role',
    [sequelize.fn('COUNT', sequelize.col('id')), 'count']
  ],
  group: ['role']
});

// Prisma
const result = await prisma.users.groupBy({
  by: ['role'],
  _count: {
    id: true
  }
});
```

### Transactions
```javascript
// Sequelize
const transaction = await sequelize.transaction();
try {
  await User.create(userData, { transaction });
  await Post.create(postData, { transaction });
  await transaction.commit();
} catch (error) {
  await transaction.rollback();
  throw error;
}

// Prisma
await prisma.$transaction(async (tx) => {
  await tx.users.create({ data: userData });
  await tx.posts.create({ data: postData });
});
```

### Raw Queries
```javascript
// Sequelize
const users = await sequelize.query(
  'SELECT * FROM users WHERE status = ?',
  {
    replacements: ['active'],
    type: QueryTypes.SELECT
  }
);

// Prisma
const users = await prisma.$queryRaw`
  SELECT * FROM users WHERE status = 'active'
`;
// or with parameters
const status = 'active';
const users = await prisma.$queryRawUnsafe(
  'SELECT * FROM users WHERE status = ?',
  status
);
```

## Model-specific Changes

### Hooks
Sequelize hooks need to be implemented differently in Prisma:

```javascript
// Sequelize
User.beforeCreate(async (user) => {
  user.password = await bcrypt.hash(user.password, 10);
});

// Prisma - Use middleware or implement in service layer
// In service layer:
async function createUser(data) {
  const hashedPassword = await bcrypt.hash(data.password, 10);
  return prisma.users.create({
    data: { ...data, password: hashedPassword }
  });
}
```

### Validations
```javascript
// Sequelize
const User = sequelize.define('User', {
  email: {
    type: DataTypes.STRING,
    validate: {
      isEmail: true
    }
  }
});

// Prisma - Validate in service layer or use a validation library
const { z } = require('zod');
const UserSchema = z.object({
  email: z.string().email()
});

async function createUser(data) {
  const validated = UserSchema.parse(data);
  return prisma.users.create({ data: validated });
}
```

### Soft Deletes
```javascript
// Sequelize with paranoid: true
await User.destroy({ where: { id } }); // Soft delete
await User.restore({ where: { id } }); // Restore

// Prisma
// Soft delete
await prisma.users.update({
  where: { id },
  data: { deleted_at: new Date() }
});

// Restore
await prisma.users.update({
  where: { id },
  data: { deleted_at: null }
});

// Find non-deleted
const users = await prisma.users.findMany({
  where: { deleted_at: null }
});
```

## Common Patterns

### Find or Create
```javascript
// Sequelize
const [user, created] = await User.findOrCreate({
  where: { email },
  defaults: { name, email }
});

// Prisma
const user = await prisma.users.upsert({
  where: { email },
  update: {},
  create: { name, email }
});
```

### Bulk Operations
```javascript
// Sequelize
await User.bulkCreate(usersData);

// Prisma
await prisma.users.createMany({
  data: usersData
});
```

### Select Specific Fields
```javascript
// Sequelize
const users = await User.findAll({
  attributes: ['id', 'name', 'email']
});

// Prisma
const users = await prisma.users.findMany({
  select: {
    id: true,
    name: true,
    email: true
  }
});
```

## Notes

1. Prisma uses lowercase model names by default (e.g., `users` instead of `User`)
2. Prisma doesn't have built-in soft delete - implement it manually
3. Validations should be handled in the service layer
4. Use Prisma middleware for hook-like functionality
5. Prisma has better TypeScript support out of the box