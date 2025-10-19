import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as authApi from '@/api/auth'
import { showSuccess, showError } from '@/utils/message'
import router from '@/router'

export const getUploadAction = () => `${import.meta.env.VITE_API_BASE_URL}/upload/image`

export const getAuthHeaders = token => ({
  Authorization: `Bearer ${token || localStorage.getItem('token') || ''}`
})

export const useAuthStore = defineStore(
  'auth',
  () => {
    // State
    const token = ref(localStorage.getItem('admin_token') || '')
    const refreshToken = ref(localStorage.getItem('admin_refresh_token') || '')
    const user = ref(null)
    const permissions = ref([])
    const roles = ref([])
    const accessResources = ref({
      routes: [],
      flatRoutes: [],
      routeNames: [],
      buttons: [],
      buttonMap: {}
    })
    const loading = ref(false)

    // Getters
    const isAuthenticated = computed(() => !!token.value)
    const userRole = computed(() => user.value?.role || '')
    const allRoles = computed(() => {
      const roleSet = new Set()
      if (typeof user.value?.role === 'string' && user.value.role.trim()) {
        roleSet.add(user.value.role)
      }
      if (Array.isArray(roles.value)) {
        roles.value
          .filter(role => typeof role === 'string' && role.trim())
          .forEach(role => roleSet.add(role))
      }
      return Array.from(roleSet)
    })
    const normalizedRoleSet = computed(() => {
      const normalized = new Set()
      allRoles.value.forEach(role => {
        const code = typeof role === 'string' ? role.trim().toLowerCase() : ''
        if (code) {
          normalized.add(code)
        }
      })
      return normalized
    })
    const accessibleRouteNameSet = computed(() => {
      const names = Array.isArray(accessResources.value.routeNames)
        ? accessResources.value.routeNames
        : []
      const result = new Set()
      names.forEach(name => {
        if (typeof name === 'string') {
          const cleaned = name.trim()
          if (cleaned) {
            result.add(cleaned)
          }
        }
      })
      return result
    })
    const userName = computed(() => user.value?.realName || user.value?.username || '')
    const userAvatar = computed(() => user.value?.avatar || '')

    // Actions

    /**
     * 用户登录
     * @param {Object} loginForm - 登录表单数据
     */
    const login = async loginForm => {
      loading.value = true
      try {
        const response = await authApi.login(loginForm)
        const { user: userData, tokens } = response.data

        // 保存用户信息和令牌
        setToken(tokens.accessToken)
        setRefreshToken(tokens.refreshToken)
        setUser(userData)

        showSuccess('登录成功')

        // 重定向到首页或指定页面
        const redirect = router.currentRoute.value.query.redirect || '/'
        router.push(redirect)

        return response
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

        showSuccess('已退出登录')
      }
    }

    /**
     * 获取当前用户信息
     */
    const getCurrentUser = async () => {
      try {
        loading.value = true

        const response = await authApi.getCurrentUser()
        const userData = response.data

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

        showSuccess('密码修改成功')

        return response
      } catch (error) {
        showError(error.message || '密码修改失败')
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
        const updatedUser = response.data

        setUser(updatedUser)

        showSuccess('资料更新成功')

        return response
      } catch (error) {
        showError(error.message || '资料更新失败')
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
    const normalizeAccessResources = resources => {
      if (!resources || typeof resources !== 'object') {
        return {
          routes: [],
          flatRoutes: [],
          routeNames: [],
          buttons: [],
          buttonMap: {}
        }
      }
      const { routes, flatRoutes, routeNames, buttons, buttonMap } = resources
      return {
        routes: Array.isArray(routes) ? routes : [],
        flatRoutes: Array.isArray(flatRoutes) ? flatRoutes : [],
        routeNames: Array.isArray(routeNames) ? routeNames : [],
        buttons: Array.isArray(buttons) ? buttons : [],
        buttonMap: buttonMap && typeof buttonMap === 'object' ? buttonMap : {}
      }
    }

    const setUser = userData => {
      user.value = userData
      // 后端返回的权限、角色需去重并保留有效字符串
      const permissionList = Array.isArray(userData.permissions)
        ? userData.permissions.filter(code => typeof code === 'string' && code.trim())
        : []
      const permissionSet = new Set(permissionList.map(code => code.trim()))

      const rolePool = []
      if (Array.isArray(userData.roles)) {
        userData.roles
          .filter(role => typeof role === 'string' && role.trim())
          .forEach(role => rolePool.push(role))
      }
      if (typeof userData.role === 'string' && userData.role.trim()) {
        rolePool.push(userData.role)
      }
      const roleSet = new Set(rolePool)

      const normalizedRoles = Array.from(roleSet).map(role => role.trim().toLowerCase())
      const isAdmin = normalizedRoles.includes('admin')
      if (isAdmin) {
        permissionSet.add('*')
      }

      permissions.value = Array.from(permissionSet)
      roles.value = Array.from(roleSet)
      accessResources.value = normalizeAccessResources(userData.accessResources)
    }

    /**
     * 清除认证数据
     */
    const clearAuthData = () => {
      token.value = ''
      refreshToken.value = ''
      user.value = null
      permissions.value = []
      roles.value = []
      accessResources.value = {
        routes: [],
        flatRoutes: [],
        routeNames: [],
        buttons: [],
        buttonMap: {}
      }

      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_refresh_token')
    }

    /**
     * 检查用户权限
     * @param {string} permission - 权限标识
     */
    const hasPermission = permission => {
      if (typeof permission !== 'string') {
        return false
      }
      const code = permission.trim()
      if (!code) {
        return false
      }
      return permissions.value.includes('*') || permissions.value.includes(code)
    }

    /**
     * 检查路由访问权限
     * @param {string} routeName - 路由名称
     */
    const hasRouteAccess = routeName => {
      if (typeof routeName !== 'string') {
        return false
      }
      const name = routeName.trim()
      if (!name) {
        return false
      }
      if (permissions.value.includes('*')) {
        return true
      }
      return accessibleRouteNameSet.value.has(name)
    }

    /**
     * 检查用户是否具备任意角色
     * @param {string|string[]} targetRoles - 角色标识或数组
     */
    const hasAnyRole = targetRoles => {
      const list = Array.isArray(targetRoles) ? targetRoles : [targetRoles]
      const normalized = list
        .map(role => (typeof role === 'string' ? role.trim().toLowerCase() : ''))
        .filter(Boolean)
      if (normalized.length === 0) {
        return true
      }
      const userRoles = normalizedRoleSet.value
      return normalized.some(role => userRoles.has(role))
    }

    /**
     * 检查用户角色
     * @param {string} role - 角色标识
     */
    const hasRole = role => {
      if (typeof role !== 'string') {
        return false
      }
      return hasAnyRole(role)
    }

    return {
      // State
      token,
      refreshToken,
      user,
      permissions,
      roles,
      accessResources,
      loading,

      // Getters
      isAuthenticated,
      userRole,
      allRoles,
      userName,
      userAvatar,
      accessibleRouteNameSet,

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
      hasRouteAccess,
      hasAnyRole,
      hasRole
    }
  },
  {
    persist: {
      key: 'admin_auth',
      storage: localStorage,
      paths: ['token', 'refreshToken', 'user', 'permissions', 'roles', 'accessResources']
    }
  }
)
