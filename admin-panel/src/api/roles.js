import request from './request'

export function listRoles() {
  return request.get('/roles')
}

export function createRole(data) {
  return request.post('/roles', data)
}

export function updateRole(id, data) {
  return request.put(`/roles/${id}`, data)
}

export function deleteRole(id) {
  return request.delete(`/roles/${id}`)
}

export function setUserRoles(userId, roleIds) {
  return request.post(`/roles/assign/${userId}`, { roleIds })
}


