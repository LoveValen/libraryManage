'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Helper function to check if column exists
    const columnExists = async (table, column) => {
      const describe = await queryInterface.describeTable(table);
      return describe[column] !== undefined;
    };

    // Only add columns that don't exist
    if (!(await columnExists('users', 'gender'))) {
      await queryInterface.addColumn('users', 'gender', {
        type: Sequelize.ENUM('male', 'female', 'other'),
        allowNull: true,
      });
    }

    if (!(await columnExists('users', 'birthday'))) {
      await queryInterface.addColumn('users', 'birthday', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }

    if (!(await columnExists('users', 'student_id'))) {
      await queryInterface.addColumn('users', 'student_id', {
        type: Sequelize.STRING(50),
        allowNull: true,
      });
    }

    if (!(await columnExists('users', 'department'))) {
      await queryInterface.addColumn('users', 'department', {
        type: Sequelize.STRING(100),
        allowNull: true,
      });
    }

    if (!(await columnExists('users', 'points_balance'))) {
      await queryInterface.addColumn('users', 'points_balance', {
        type: Sequelize.INTEGER.UNSIGNED,
        defaultValue: 0,
        allowNull: false,
      });
    }

    if (!(await columnExists('users', 'borrow_permission'))) {
      await queryInterface.addColumn('users', 'borrow_permission', {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: JSON.stringify(['borrow', 'renew', 'reserve']),
      });
    }

    if (!(await columnExists('users', 'borrow_limit'))) {
      await queryInterface.addColumn('users', 'borrow_limit', {
        type: Sequelize.INTEGER.UNSIGNED,
        defaultValue: 10,
        allowNull: false,
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('users', 'gender');
    await queryInterface.removeColumn('users', 'birthday');
    await queryInterface.removeColumn('users', 'student_id');
    await queryInterface.removeColumn('users', 'department');
    await queryInterface.removeColumn('users', 'points_balance');
    await queryInterface.removeColumn('users', 'borrow_permission');
    await queryInterface.removeColumn('users', 'borrow_limit');
  }
};