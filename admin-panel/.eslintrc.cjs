/* eslint-env node */
require('@rushstack/eslint-patch/modern-module-resolution')

module.exports = {
  root: true,
  extends: [
    'plugin:vue/vue3-essential',
    'eslint:recommended',
    './.eslintrc-auto-import.json',
    '@vue/eslint-config-prettier'
  ],
  env: {
    'vue/setup-compiler-macros': true,
    node: true,
    browser: true,
    es2022: true
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  plugins: ['vue'],
  rules: {
    // Vue 相关规则 - 更宽松的配置
    'vue/multi-word-component-names': 'off',
    'vue/no-unused-vars': 'warn',
    'vue/no-unused-components': 'warn',
    'vue/require-default-prop': 'off',
    'vue/require-prop-types': 'off',
    'vue/no-v-html': 'off',
    'vue/no-template-shadow': 'off',
    'vue/no-mutating-props': 'warn',
    'vue/no-reserved-component-names': 'off',
    'vue/valid-v-slot': 'off',
    'vue/no-lone-template': 'off',
    'vue/no-v-text-v-html-on-component': 'off',
    'vue/no-multiple-template-root': 'off',

    // Vue 格式化规则 - 降级为警告
    'vue/no-irregular-whitespace': 'warn',
    'vue/object-curly-spacing': 'off',
    'vue/array-bracket-spacing': 'off',
    'vue/arrow-spacing': 'warn',
    'vue/block-spacing': 'warn',
    'vue/brace-style': 'off',
    'vue/camelcase': 'off',
    'vue/comma-dangle': 'off',
    'vue/component-name-in-template-casing': ['warn', 'PascalCase'],
    'vue/dot-location': 'off',
    'vue/eqeqeq': 'warn',
    'vue/key-spacing': 'off',
    'vue/keyword-spacing': 'off',
    'vue/no-empty-pattern': 'warn',
    'vue/no-extra-parens': 'off',
    'vue/no-sparse-arrays': 'warn',
    'vue/object-curly-newline': 'off',
    'vue/object-property-newline': 'off',
    'vue/operator-linebreak': 'off',
    'vue/space-in-parens': 'off',
    'vue/space-infix-ops': 'off',
    'vue/space-unary-ops': 'off',
    'vue/template-curly-spacing': 'off',

    // JavaScript 通用规则 - 更宽松的配置
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'no-unused-vars': 'off',
    'no-undef': 'off', // 关闭未定义检查，因为有自动导入
    'prefer-const': 'warn',
    'no-var': 'error',
    'object-shorthand': 'warn',
    'prefer-template': 'off',
    'template-curly-spacing': 'off',
    'yield-star-spacing': 'off',
    'prefer-rest-params': 'warn',
    'no-useless-escape': 'off',
    'no-multiple-empty-lines': 'off',
    'space-before-function-paren': 'off',
    'object-curly-spacing': 'off',
    'comma-dangle': 'off',
    quotes: 'off',
    semi: 'off',
    indent: 'off',
    'eol-last': 'off',
    'no-trailing-spaces': 'off',
    'no-empty': 'warn',
    'no-mixed-spaces-and-tabs': 'off',
    'no-irregular-whitespace': 'off',
    'arrow-spacing': 'warn',

    // Prettier 相关 - 关闭以避免冲突
    'prettier/prettier': 'off'
  },
  globals: {
    // Vue 3 自动导入
    defineProps: 'readonly',
    defineEmits: 'readonly',
    defineExpose: 'readonly',
    withDefaults: 'readonly',

    // Element Plus 自动导入的全局变量
    ElMessage: 'readonly',
    ElMessageBox: 'readonly',
    ElNotification: 'readonly',
    ElLoading: 'readonly'
  }
}
