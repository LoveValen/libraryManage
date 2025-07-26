import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as authApi from '@/api/auth'
import { ElMessage } from 'element-plus'
import router from '@/router'

export const useAuthStore = defineStore(
  'auth',
  () => {
    // State
    const token = ref(localStorage.getItem('admin_token') || '')
    const refreshToken = ref(localStorage.getItem('admin_refresh_token') || '')
    const user = ref(null)
    const permissions = ref([])
    const loading = ref(false)

    // Getters
    const isAuthenticated = computed(() => !!token.value)
    const userRole = computed(() => user.value?.role || '')
    const userName = computed(() => user.value?.realName || user.value?.username || '')
    const userAvatar = computed(() => user.value?.avatar || '')

    // Actions

    /**
     * 用户登录
     * @param {Object} loginForm - 登录表单数据
     */
    const login = async loginForm => {
      try {
        loading.value = true

        const response = await authApi.login(loginForm)
        const { user: userData, tokens } = response.data

        // 保存用户信息和令牌
        setToken(tokens.accessToken)
        setRefreshToken(tokens.refreshToken)
        setUser(userData)

        ElMessage.success('登录成功')

        // 重定向到首页或指定页面
        const redirect = router.currentRoute.value.query.redirect || '/'
        router.push(redirect)

        return response
      } catch (error) {
        ElMessage.error(error.message || '登录失败')
        throw error
      } finally {
        loading.value = false
      }
    }

    /**
     * 用户登出
     */
    const logout = async () => {
      try {
        if (token.value) {
          await authApi.logout()
        }
      } catch (error) {
        console.error('登出请求失败:', error)
      } finally {
        // 清除本地数据
        clearAuthData()

        // 重定向到登录页
        router.push('/login')

        ElMessage.success('已退出登录')
      }
    }

    /**
     * 获取当前用户信息
     */
    const getCurrentUser = async () => {
      try {
        loading.value = true

        const response = await authApi.getCurrentUser()
        const userData = response.data.user

        setUser(userData)

        return userData
      } catch (error) {
        console.error('获取用户信息失败:', error)
        throw error
      } finally {
        loading.value = false
      }
    }

    /**
     * 刷新令牌
     */
    const refreshAccessToken = async () => {
      try {
        if (!refreshToken.value) {
          throw new Error('No refresh token available')
        }

        const response = await authApi.refreshToken({
          refreshToken: refreshToken.value
        })

        const { accessToken } = response.data
        setToken(accessToken)

        return accessToken
      } catch (error) {
        console.error('刷新令牌失败:', error)
        // 刷新失败，清除认证数据并重定向到登录页
        clearAuthData()
        router.push('/login')
        throw error
      }
    }

    /**
     * 修改密码
     * @param {Object} passwordData - 密码数据
     */
    const changePassword = async passwordData => {
      try {
        loading.value = true

        const response = await authApi.changePassword(passwordData)

        ElMessage.success('密码修改成功')

        return response
      } catch (error) {
        ElMessage.error(error.message || '密码修改失败')
        throw error
      } finally {
        loading.value = false
      }
    }

    /**
     * 更新用户资料
     * @param {Object} profileData - 用户资料数据
     */
    const updateProfile = async profileData => {
      try {
        loading.value = true

        const response = await authApi.updateProfile(profileData)
        const updatedUser = response.data.user

        setUser(updatedUser)

        ElMessage.success('资料更新成功')

        return response
      } catch (error) {
        ElMessage.error(error.message || '资料更新失败')
        throw error
      } finally {
        loading.value = false
      }
    }

    /**
     * 验证令牌有效性
     */
    const verifyToken = async () => {
      try {
        if (!token.value) {
          return false
        }

        const response = await authApi.verifyToken()
        return response.success
      } catch (error) {
        console.error('令牌验证失败:', error)
        return false
      }
    }

    /**
     * 设置令牌
     * @param {string} newToken - 新令牌
     */
    const setToken = newToken => {
      token.value = newToken
      localStorage.setItem('admin_token', newToken)
    }

    /**
     * 设置刷新令牌
     * @param {string} newRefreshToken - 新刷新令牌
     */
    const setRefreshToken = newRefreshToken => {
      refreshToken.value = newRefreshToken
      localStorage.setItem('admin_refresh_token', newRefreshToken)
    }

    /**
     * 设置用户信息
     * @param {Object} userData - 用户数据
     */
    const setUser = userData => {
      user.value = userData

      // 提取用户权限
      if (userData.role === 'admin') {
        permissions.value = ['*'] // 管理员拥有所有权限
      } else {
        permissions.value = ['read'] // 普通用户只有读权限
      }
    }

    /**
     * 清除认证数据
     */
    const clearAuthData = () => {
      token.value = ''
      refreshToken.value = ''
      user.value = null
      permissions.value = []

      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_refresh_token')
    }

    /**
     * 检查用户权限
     * @param {string} permission - 权限标识
     */
    const hasPermission = permission => {
      return permissions.value.includes('*') || permissions.value.includes(permission)
    }

    /**
     * 检查用户角色
     * @param {string} role - 角色标识
     */
    const hasRole = role => {
      return userRole.value === role
    }

    return {
      // State
      token,
      refreshToken,
      user,
      permissions,
      loading,

      // Getters
      isAuthenticated,
      userRole,
      userName,
      userAvatar,

      // Actions
      login,
      logout,
      getCurrentUser,
      refreshAccessToken,
      changePassword,
      updateProfile,
      verifyToken,
      setToken,
      setRefreshToken,
      setUser,
      clearAuthData,
      hasPermission,
      hasRole
    }
  },
  {
    persist: {
      key: 'admin_auth',
      storage: localStorage,
      paths: ['token', 'refreshToken', 'user']
    }
  }
)
