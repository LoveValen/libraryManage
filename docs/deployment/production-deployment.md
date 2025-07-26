# 🚀 生产环境部署指南

企业级图书管理系统的生产环境部署完整指南，涵盖云部署、容器编排、监控配置和运维最佳实践。

## 📋 目录

- [部署架构概览](#部署架构概览)
- [环境准备](#环境准备)
- [Docker部署](#docker部署)
- [Kubernetes部署](#kubernetes部署)
- [云平台部署](#云平台部署)
- [负载均衡配置](#负载均衡配置)
- [监控和日志](#监控和日志)
- [安全配置](#安全配置)
- [运维管理](#运维管理)

## 🏗️ 部署架构概览

### 生产环境架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        用户访问层 (User Access Layer)              │
├─────────────────────────────────────────────────────────────────┤
│  CDN/WAF     │  Load Balancer  │  SSL Termination │  Rate Limit │
│  (CloudFlare)│  (AWS ALB)      │  (Let's Encrypt) │             │
└─────────────────┬───────────────────────────────────────────────┘
                  │ HTTPS/HTTP2
┌─────────────────┴───────────────────────────────────────────────┐
│                      Web服务层 (Web Service Layer)               │
├─────────────────────────────────────────────────────────────────┤
│   Frontend     │   Frontend     │   Admin Panel   │   API Docs  │
│   (Nginx)      │   (Nginx)      │   (Nginx)       │   (Nginx)   │
│   Replica 1    │   Replica 2    │   Replica 1     │   Static    │
└─────────────────┬───────────────────────────────────────────────┘
                  │ API Gateway
┌─────────────────┴───────────────────────────────────────────────┐
│                     API服务层 (API Service Layer)                │
├─────────────────────────────────────────────────────────────────┤
│  API Gateway   │  API Gateway   │  API Gateway    │  WebSocket  │
│  (Kong/Istio)  │  (Kong/Istio)  │  (Kong/Istio)   │  Service    │
│  Replica 1     │  Replica 2     │  Replica 3      │             │
└─────────────────┬───────────────────────────────────────────────┘
                  │ Service Mesh
┌─────────────────┴───────────────────────────────────────────────┐
│                    业务服务层 (Business Service Layer)            │
├─────────────────────────────────────────────────────────────────┤
│ User Service   │ Book Service   │ Borrow Service  │ Notification│
│ (3 replicas)   │ (4 replicas)   │ (3 replicas)    │ Service     │
│ ──────────────┼────────────────┼─────────────────┼──────────── │
│ Auth Service   │ Search Service │ Analytics       │ File Service│
│ (2 replicas)   │ (2 replicas)   │ Service         │ (2 replicas)│
│                │                │ (1 replica)     │             │
└─────────────────┬───────────────────────────────────────────────┘
                  │ Database Connections
┌─────────────────┴───────────────────────────────────────────────┐
│                    数据存储层 (Data Storage Layer)                │
├─────────────────────────────────────────────────────────────────┤
│ PostgreSQL     │ Redis Cluster  │ Elasticsearch   │ File Storage│
│ Primary + 3    │ 6 nodes        │ 3 master        │ MinIO       │
│ Read Replicas  │ (3M + 3S)      │ 2 data nodes    │ 4 nodes     │
└─────────────────────────────────────────────────────────────────┘
```

### 部署环境分层

```yaml
# 环境配置层级
environments:
  development:
    description: "开发环境"
    replicas: 1
    resources: "最小"
    
  staging:
    description: "预发布环境"
    replicas: 2
    resources: "中等"
    
  production:
    description: "生产环境"
    replicas: 3+
    resources: "高可用"
    
  disaster_recovery:
    description: "灾备环境"
    replicas: 2
    resources: "生产级"
```

## 🛠️ 环境准备

### 系统要求

#### 硬件配置建议

```yaml
# 生产环境最低配置
minimum_requirements:
  api_servers:
    cpu: "4 cores"
    memory: "8GB"
    disk: "100GB SSD"
    network: "1Gbps"
    nodes: 3
    
  database_servers:
    cpu: "8 cores"
    memory: "32GB"
    disk: "1TB NVMe SSD"
    network: "10Gbps"
    nodes: 2 (Primary + Replica)
    
  cache_servers:
    cpu: "4 cores"
    memory: "16GB"
    disk: "200GB SSD"
    network: "1Gbps"
    nodes: 3
    
  search_servers:
    cpu: "8 cores"
    memory: "16GB"
    disk: "500GB SSD"
    network: "1Gbps"
    nodes: 3

# 推荐配置（高可用）
recommended_requirements:
  api_servers:
    cpu: "8 cores"
    memory: "16GB"
    disk: "200GB SSD"
    nodes: 5
    
  database_servers:
    cpu: "16 cores"
    memory: "64GB"
    disk: "2TB NVMe SSD"
    nodes: 4 (1 Primary + 3 Replicas)
    
  load_balancers:
    cpu: "4 cores"
    memory: "8GB"
    disk: "100GB SSD"
    nodes: 2
```

#### 软件环境

```bash
# 操作系统要求
OS: Ubuntu 22.04 LTS / CentOS 8 / RHEL 8+
Kernel: 5.4+

# 容器运行时
Docker: 24.0+
containerd: 1.6+
Kubernetes: 1.28+

# 网络要求
IPv4/IPv6: Dual Stack
Bandwidth: 100Mbps+
Latency: <50ms (region internal)

# 存储要求
Filesystem: ext4/xfs
IOPS: 3000+ (database)
Throughput: 500MB/s+ (database)
```

### 安全准备

```bash
# 1. 创建专用用户
sudo useradd -m -s /bin/bash library-app
sudo usermod -aG docker library-app

# 2. 配置SSH密钥认证
ssh-keygen -t ed25519 -C "library-deployment"
# 禁用密码登录

# 3. 配置防火墙
sudo ufw enable
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 6443/tcp  # Kubernetes API (if applicable)

# 4. 配置时间同步
sudo apt install chrony
sudo systemctl enable chrony
sudo systemctl start chrony

# 5. 配置日志轮转
sudo logrotate -d /etc/logrotate.conf
```

## 🐳 Docker部署

### 生产级Docker Compose

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  # API网关
  api-gateway:
    image: kong:3.4
    ports:
      - "80:8000"
      - "443:8443"
      - "8001:8001"
    environment:
      KONG_DATABASE: postgres
      KONG_PG_HOST: postgres-primary
      KONG_PG_DATABASE: kong
      KONG_PG_USER: kong
      KONG_PG_PASSWORD: ${KONG_DB_PASSWORD}
      KONG_ADMIN_LISTEN: "0.0.0.0:8001"
      KONG_PROXY_ACCESS_LOG: /dev/stdout
      KONG_ADMIN_ACCESS_LOG: /dev/stdout
      KONG_PROXY_ERROR_LOG: /dev/stderr
      KONG_ADMIN_ERROR_LOG: /dev/stderr
    volumes:
      - ./config/kong:/etc/kong/
    depends_on:
      - postgres-primary
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
    networks:
      - frontend
      - backend

  # 主应用服务
  api-server:
    image: library/api:${API_VERSION:-latest}
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres-primary:5432/${DB_NAME}
      REDIS_URL: redis://redis-cluster:6379
      ELASTICSEARCH_URL: http://elasticsearch:9200
      JWT_SECRET: ${JWT_SECRET}
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
      FILE_STORAGE_URL: http://minio:9000
      LOG_LEVEL: info
      MAX_REQUEST_SIZE: 10mb
      RATE_LIMIT_WINDOW: 900000
      RATE_LIMIT_MAX: 1000
    volumes:
      - /var/log/library:/app/logs
      - ./config/app:/app/config
    deploy:
      replicas: 5
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
      update_config:
        parallelism: 2
        delay: 10s
        failure_action: rollback
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - backend
    depends_on:
      - postgres-primary
      - redis-cluster
      - elasticsearch

  # WebSocket服务
  websocket-server:
    image: library/websocket:${WS_VERSION:-latest}
    environment:
      NODE_ENV: production
      REDIS_URL: redis://redis-cluster:6379
      JWT_SECRET: ${JWT_SECRET}
      CORS_ORIGIN: ${FRONTEND_URL}
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
    networks:
      - backend
    depends_on:
      - redis-cluster

  # PostgreSQL主库
  postgres-primary:
    image: postgres:15.4
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_INITDB_ARGS: "--auth-host=md5"
      PGDATA: /var/lib/postgresql/data/pgdata
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./config/postgres/postgresql.conf:/etc/postgresql/postgresql.conf
      - ./config/postgres/pg_hba.conf:/etc/postgresql/pg_hba.conf
      - ./scripts/postgres/init:/docker-entrypoint-initdb.d
    command: postgres -c config_file=/etc/postgresql/postgresql.conf
    deploy:
      replicas: 1
      resources:
        limits:
          cpus: '4.0'
          memory: 8G
        reservations:
          cpus: '2.0'
          memory: 4G
      placement:
        constraints:
          - node.labels.postgres.primary == true
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
      interval: 30s
      timeout: 10s
      retries: 5
    networks:
      - backend

  # PostgreSQL只读副本
  postgres-replica:
    image: postgres:15.4
    environment:
      PGUSER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      PGPASSWORD: ${DB_PASSWORD}
      POSTGRES_MASTER_SERVICE: postgres-primary
    volumes:
      - postgres_replica_data:/var/lib/postgresql/data
      - ./scripts/postgres/replica:/docker-entrypoint-initdb.d
    command: |
      bash -c "
        if [ ! -f /var/lib/postgresql/data/recovery.conf ]; then
          pg_basebackup -h postgres-primary -D /var/lib/postgresql/data -U ${DB_USER} -W
          echo 'standby_mode = on' >> /var/lib/postgresql/data/recovery.conf
          echo 'primary_conninfo = host=postgres-primary port=5432 user=${DB_USER}' >> /var/lib/postgresql/data/recovery.conf
        fi
        postgres
      "
    deploy:
      replicas: 2
      placement:
        constraints:
          - node.labels.postgres.replica == true
    depends_on:
      - postgres-primary
    networks:
      - backend

  # Redis集群
  redis-cluster:
    image: redis:7.2-alpine
    command: redis-server --cluster-enabled yes --cluster-config-file nodes.conf --cluster-node-timeout 5000 --appendonly yes
    volumes:
      - redis_data:/data
    deploy:
      replicas: 6
      resources:
        limits:
          cpus: '1.0'
          memory: 2G
    networks:
      - backend

  # Elasticsearch集群
  elasticsearch:
    image: elasticsearch:8.10.0
    environment:
      - node.name=es-node-{{.Task.Slot}}
      - cluster.name=library-es-cluster
      - discovery.seed_hosts=elasticsearch
      - cluster.initial_master_nodes=es-node-1,es-node-2,es-node-3
      - bootstrap.memory_lock=true
      - "ES_JAVA_OPTS=-Xms2g -Xmx2g"
      - xpack.security.enabled=false
    ulimits:
      memlock:
        soft: -1
        hard: -1
    volumes:
      - es_data:/usr/share/elasticsearch/data
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
        reservations:
          cpus: '1.0'
          memory: 2G
    networks:
      - backend

  # MinIO对象存储
  minio:
    image: minio/minio:RELEASE.2023-11-01T18-37-25Z
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ACCESS_KEY}
      MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY}
    volumes:
      - minio_data:/data
    deploy:
      replicas: 4
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
    networks:
      - backend

  # 前端应用
  frontend:
    image: library/frontend:${FRONTEND_VERSION:-latest}
    environment:
      API_BASE_URL: ${API_BASE_URL}
      WS_URL: ${WS_URL}
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
    networks:
      - frontend

  # Nginx负载均衡
  nginx:
    image: nginx:1.25-alpine
    ports:
      - "8080:80"
    volumes:
      - ./config/nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./config/nginx/conf.d:/etc/nginx/conf.d
      - nginx_logs:/var/log/nginx
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
    networks:
      - frontend
      - backend
    depends_on:
      - frontend
      - api-server

volumes:
  postgres_data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /opt/library/data/postgres
  postgres_replica_data:
  redis_data:
  es_data:
  minio_data:
  nginx_logs:

networks:
  frontend:
    driver: overlay
    attachable: true
  backend:
    driver: overlay
    internal: true

configs:
  nginx_config:
    file: ./config/nginx/nginx.conf
  postgres_config:
    file: ./config/postgres/postgresql.conf

secrets:
  db_password:
    file: ./secrets/db_password.txt
  jwt_secret:
    file: ./secrets/jwt_secret.txt
  encryption_key:
    file: ./secrets/encryption_key.txt
```

### Docker Swarm部署脚本

```bash
#!/bin/bash
# deploy-docker-swarm.sh

set -e

# 配置变量
STACK_NAME="library-management"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查环境
check_prerequisites() {
    log_info "检查部署环境..."
    
    # 检查Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker未安装"
        exit 1
    fi
    
    # 检查Docker Swarm
    if ! docker info | grep -q "Swarm: active"; then
        log_error "Docker Swarm未初始化"
        exit 1
    fi
    
    # 检查环境文件
    if [ ! -f "$ENV_FILE" ]; then
        log_error "环境配置文件 $ENV_FILE 不存在"
        exit 1
    fi
    
    # 检查配置文件
    if [ ! -f "$COMPOSE_FILE" ]; then
        log_error "Docker Compose文件 $COMPOSE_FILE 不存在"
        exit 1
    fi
    
    log_info "环境检查通过"
}

# 创建网络
create_networks() {
    log_info "创建Docker网络..."
    
    # 创建前端网络
    docker network create --driver overlay --attachable frontend 2>/dev/null || true
    
    # 创建后端网络（内部）
    docker network create --driver overlay --internal backend 2>/dev/null || true
    
    log_info "网络创建完成"
}

# 创建存储卷
create_volumes() {
    log_info "创建存储卷..."
    
    # 创建数据目录
    sudo mkdir -p /opt/library/data/{postgres,redis,elasticsearch,minio}
    sudo chown -R 999:999 /opt/library/data/postgres
    sudo chown -R 1000:1000 /opt/library/data/elasticsearch
    
    log_info "存储卷创建完成"
}

# 配置节点标签
setup_node_labels() {
    log_info "配置节点标签..."
    
    # 获取节点列表
    NODES=($(docker node ls --format "{{.Hostname}}" --filter "role=worker"))
    
    if [ ${#NODES[@]} -ge 3 ]; then
        # 为数据库节点打标签
        docker node update --label-add postgres.primary=true ${NODES[0]}
        docker node update --label-add postgres.replica=true ${NODES[1]}
        docker node update --label-add postgres.replica=true ${NODES[2]}
        
        log_info "节点标签配置完成"
    else
        log_warn "工作节点数量不足，跳过节点标签配置"
    fi
}

# 部署密钥
deploy_secrets() {
    log_info "部署敏感信息..."
    
    # 创建密钥目录
    mkdir -p secrets
    
    # 生成随机密钥（如果不存在）
    [ ! -f secrets/db_password.txt ] && openssl rand -base64 32 > secrets/db_password.txt
    [ ! -f secrets/jwt_secret.txt ] && openssl rand -base64 64 > secrets/jwt_secret.txt
    [ ! -f secrets/encryption_key.txt ] && openssl rand -base64 32 > secrets/encryption_key.txt
    
    # 部署Docker secrets
    docker secret create db_password secrets/db_password.txt 2>/dev/null || true
    docker secret create jwt_secret secrets/jwt_secret.txt 2>/dev/null || true
    docker secret create encryption_key secrets/encryption_key.txt 2>/dev/null || true
    
    log_info "密钥部署完成"
}

# 部署应用栈
deploy_stack() {
    log_info "部署应用栈..."
    
    # 加载环境变量
    export $(cat $ENV_FILE | xargs)
    
    # 部署栈
    docker stack deploy -c $COMPOSE_FILE --with-registry-auth $STACK_NAME
    
    log_info "应用栈部署完成"
}

# 等待服务就绪
wait_for_services() {
    log_info "等待服务启动..."
    
    # 等待数据库服务
    timeout=300
    while [ $timeout -gt 0 ]; do
        if docker service ps ${STACK_NAME}_postgres-primary --filter "desired-state=running" --format "{{.CurrentState}}" | grep -q "Running"; then
            log_info "数据库服务已启动"
            break
        fi
        sleep 5
        timeout=$((timeout - 5))
    done
    
    if [ $timeout -eq 0 ]; then
        log_error "数据库服务启动超时"
        exit 1
    fi
    
    # 等待API服务
    timeout=300
    while [ $timeout -gt 0 ]; do
        if curl -f http://localhost:8080/health &>/dev/null; then
            log_info "API服务已就绪"
            break
        fi
        sleep 5
        timeout=$((timeout - 5))
    done
    
    if [ $timeout -eq 0 ]; then
        log_error "API服务启动超时"
        exit 1
    fi
    
    log_info "所有服务已就绪"
}

# 验证部署
verify_deployment() {
    log_info "验证部署状态..."
    
    # 检查服务状态
    docker service ls --filter "label=com.docker.stack.namespace=$STACK_NAME"
    
    # 检查服务健康状态
    unhealthy_services=$(docker service ls --filter "label=com.docker.stack.namespace=$STACK_NAME" --format "{{.Name}} {{.Replicas}}" | grep "0/")
    
    if [ -n "$unhealthy_services" ]; then
        log_error "以下服务未正常启动："
        echo "$unhealthy_services"
        exit 1
    fi
    
    log_info "部署验证通过"
}

# 显示部署信息
show_deployment_info() {
    log_info "部署信息："
    echo "前端地址: http://$(docker node ls --filter "role=leader" --format "{{.Hostname}}"):8080"
    echo "API地址: http://$(docker node ls --filter "role=leader" --format "{{.Hostname}}"):8080/api"
    echo "管理界面: http://$(docker node ls --filter "role=leader" --format "{{.Hostname}}"):8001"
    echo ""
    echo "查看服务状态: docker service ls"
    echo "查看服务日志: docker service logs ${STACK_NAME}_<service-name>"
    echo "更新服务: docker service update ${STACK_NAME}_<service-name>"
}

# 主执行流程
main() {
    log_info "开始部署图书管理系统..."
    
    check_prerequisites
    create_networks
    create_volumes
    setup_node_labels
    deploy_secrets
    deploy_stack
    wait_for_services
    verify_deployment
    show_deployment_info
    
    log_info "部署完成！"
}

# 错误处理
trap 'log_error "部署过程中发生错误，请检查日志"; exit 1' ERR

# 执行部署
main "$@"
```

## ☸️ Kubernetes部署

### Kubernetes生产配置

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: library-management
  labels:
    name: library-management
    environment: production

---
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: library-management
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  MAX_REQUEST_SIZE: "10mb"
  RATE_LIMIT_WINDOW: "900000"
  RATE_LIMIT_MAX: "1000"
  DATABASE_POOL_SIZE: "20"
  REDIS_POOL_SIZE: "10"

---
# k8s/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: library-management
type: Opaque
data:
  DATABASE_URL: <base64-encoded-database-url>
  JWT_SECRET: <base64-encoded-jwt-secret>
  ENCRYPTION_KEY: <base64-encoded-encryption-key>
  REDIS_PASSWORD: <base64-encoded-redis-password>
  MINIO_ACCESS_KEY: <base64-encoded-minio-key>
  MINIO_SECRET_KEY: <base64-encoded-minio-secret>

---
# k8s/api-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  namespace: library-management
  labels:
    app: api-server
    version: v1
spec:
  replicas: 5
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 2
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
        version: v1
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "3000"
        prometheus.io/path: "/metrics"
    spec:
      serviceAccountName: library-api
      containers:
      - name: api
        image: library/api:1.0.0
        ports:
        - containerPort: 3000
          name: http
        - containerPort: 9090
          name: metrics
        env:
        - name: NODE_ENV
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: NODE_ENV
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: DATABASE_URL
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: JWT_SECRET
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: POD_NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        volumeMounts:
        - name: config-volume
          mountPath: /app/config
        - name: logs
          mountPath: /app/logs
      volumes:
      - name: config-volume
        configMap:
          name: app-config
      - name: logs
        emptyDir: {}
      nodeSelector:
        kubernetes.io/arch: amd64
        node-type: worker
      tolerations:
      - key: "app"
        operator: "Equal"
        value: "library"
        effect: "NoSchedule"
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - api-server
              topologyKey: kubernetes.io/hostname

---
# k8s/api-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: api-server-service
  namespace: library-management
  labels:
    app: api-server
spec:
  selector:
    app: api-server
  ports:
  - name: http
    port: 80
    targetPort: 3000
    protocol: TCP
  - name: metrics
    port: 9090
    targetPort: 9090
    protocol: TCP
  type: ClusterIP

---
# k8s/api-hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-server-hpa
  namespace: library-management
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 15

---
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: library-ingress
  namespace: library-management
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "300"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "300"
spec:
  tls:
  - hosts:
    - api.library.com
    - library.com
    secretName: library-tls
  rules:
  - host: library.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-service
            port:
              number: 80
  - host: api.library.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-server-service
            port:
              number: 80

---
# k8s/network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-network-policy
  namespace: library-management
spec:
  podSelector:
    matchLabels:
      app: api-server
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    - podSelector:
        matchLabels:
          app: frontend
    ports:
    - protocol: TCP
      port: 3000
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: postgres
    ports:
    - protocol: TCP
      port: 5432
  - to:
    - podSelector:
        matchLabels:
          app: redis
    ports:
    - protocol: TCP
      port: 6379
```

### Kubernetes部署脚本

```bash
#!/bin/bash
# deploy-kubernetes.sh

set -e

# 配置变量
NAMESPACE="library-management"
KUSTOMIZATION_DIR="k8s/overlays/production"
KUBECTL_TIMEOUT="300s"

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查环境
check_prerequisites() {
    log_info "检查Kubernetes环境..."
    
    # 检查kubectl
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl未安装"
        exit 1
    fi
    
    # 检查集群连接
    if ! kubectl cluster-info &> /dev/null; then
        log_error "无法连接到Kubernetes集群"
        exit 1
    fi
    
    # 检查节点状态
    not_ready_nodes=$(kubectl get nodes --no-headers | grep -v Ready | wc -l)
    if [ "$not_ready_nodes" -gt 0 ]; then
        log_warn "有 $not_ready_nodes 个节点未就绪"
        kubectl get nodes
    fi
    
    log_info "环境检查通过"
}

# 创建命名空间
create_namespace() {
    log_info "创建命名空间..."
    kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -
}

# 安装依赖组件
install_dependencies() {
    log_info "安装依赖组件..."
    
    # 安装Nginx Ingress Controller
    if ! kubectl get namespace ingress-nginx &> /dev/null; then
        log_info "安装Nginx Ingress Controller..."
        kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml
        kubectl wait --namespace ingress-nginx \
            --for=condition=ready pod \
            --selector=app.kubernetes.io/component=controller \
            --timeout=300s
    fi
    
    # 安装cert-manager
    if ! kubectl get namespace cert-manager &> /dev/null; then
        log_info "安装cert-manager..."
        kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
        kubectl wait --namespace cert-manager \
            --for=condition=ready pod \
            --selector=app.kubernetes.io/instance=cert-manager \
            --timeout=300s
    fi
    
    # 安装Prometheus Operator
    if ! kubectl get namespace monitoring &> /dev/null; then
        log_info "安装Prometheus Operator..."
        kubectl create namespace monitoring
        kubectl apply -f https://raw.githubusercontent.com/prometheus-operator/prometheus-operator/v0.68.0/bundle.yaml
    fi
}

# 部署数据库
deploy_database() {
    log_info "部署PostgreSQL..."
    
    # 使用Helm部署PostgreSQL HA
    if ! command -v helm &> /dev/null; then
        log_error "Helm未安装，跳过数据库部署"
        return
    fi
    
    helm repo add bitnami https://charts.bitnami.com/bitnami
    helm repo update
    
    helm upgrade --install postgresql \
        bitnami/postgresql-ha \
        --namespace $NAMESPACE \
        --set global.postgresql.auth.postgresPassword=postgres123 \
        --set global.postgresql.auth.database=library_management \
        --set postgresql.replicaCount=2 \
        --set postgresql.resources.requests.memory=2Gi \
        --set postgresql.resources.requests.cpu=1000m \
        --set postgresql.resources.limits.memory=4Gi \
        --set postgresql.resources.limits.cpu=2000m \
        --wait --timeout=$KUBECTL_TIMEOUT
}

# 部署Redis
deploy_redis() {
    log_info "部署Redis集群..."
    
    if ! command -v helm &> /dev/null; then
        log_error "Helm未安装，跳过Redis部署"
        return
    fi
    
    helm upgrade --install redis \
        bitnami/redis-cluster \
        --namespace $NAMESPACE \
        --set cluster.nodes=6 \
        --set cluster.replicas=1 \
        --set redis.resources.requests.memory=1Gi \
        --set redis.resources.requests.cpu=500m \
        --set redis.resources.limits.memory=2Gi \
        --set redis.resources.limits.cpu=1000m \
        --wait --timeout=$KUBECTL_TIMEOUT
}

# 部署Elasticsearch
deploy_elasticsearch() {
    log_info "部署Elasticsearch..."
    
    if ! command -v helm &> /dev/null; then
        log_error "Helm未安装，跳过Elasticsearch部署"
        return
    fi
    
    helm repo add elastic https://helm.elastic.co
    helm repo update
    
    helm upgrade --install elasticsearch \
        elastic/elasticsearch \
        --namespace $NAMESPACE \
        --set replicas=3 \
        --set minimumMasterNodes=2 \
        --set esJavaOpts="-Xmx2g -Xms2g" \
        --set resources.requests.cpu=1000m \
        --set resources.requests.memory=4Gi \
        --set resources.limits.cpu=2000m \
        --set resources.limits.memory=4Gi \
        --set volumeClaimTemplate.resources.requests.storage=100Gi \
        --wait --timeout=$KUBECTL_TIMEOUT
}

# 部署应用
deploy_application() {
    log_info "部署应用..."
    
    # 应用配置
    kubectl apply -f k8s/configmap.yaml
    kubectl apply -f k8s/secrets.yaml
    
    # 部署服务
    kubectl apply -f k8s/api-deployment.yaml
    kubectl apply -f k8s/api-service.yaml
    kubectl apply -f k8s/api-hpa.yaml
    
    kubectl apply -f k8s/websocket-deployment.yaml
    kubectl apply -f k8s/websocket-service.yaml
    
    kubectl apply -f k8s/frontend-deployment.yaml
    kubectl apply -f k8s/frontend-service.yaml
    
    # 网络策略
    kubectl apply -f k8s/network-policy.yaml
    
    # Ingress
    kubectl apply -f k8s/ingress.yaml
    
    # 等待部署完成
    kubectl rollout status deployment/api-server -n $NAMESPACE --timeout=$KUBECTL_TIMEOUT
    kubectl rollout status deployment/websocket-server -n $NAMESPACE --timeout=$KUBECTL_TIMEOUT
    kubectl rollout status deployment/frontend -n $NAMESPACE --timeout=$KUBECTL_TIMEOUT
}

# 配置监控
setup_monitoring() {
    log_info "配置监控..."
    
    # 部署ServiceMonitor
    kubectl apply -f k8s/monitoring/servicemonitor.yaml
    
    # 部署Grafana Dashboard
    kubectl apply -f k8s/monitoring/grafana-dashboard.yaml
    
    # 配置告警规则
    kubectl apply -f k8s/monitoring/prometheus-rules.yaml
}

# 验证部署
verify_deployment() {
    log_info "验证部署..."
    
    # 检查Pod状态
    kubectl get pods -n $NAMESPACE
    
    # 检查服务状态
    kubectl get services -n $NAMESPACE
    
    # 检查Ingress状态
    kubectl get ingress -n $NAMESPACE
    
    # 健康检查
    api_endpoint=$(kubectl get ingress library-ingress -n $NAMESPACE -o jsonpath='{.spec.rules[0].host}')
    if [ -n "$api_endpoint" ]; then
        if curl -f https://$api_endpoint/health &>/dev/null; then
            log_info "API健康检查通过"
        else
            log_warn "API健康检查失败"
        fi
    fi
}

# 主执行流程
main() {
    log_info "开始Kubernetes部署..."
    
    check_prerequisites
    create_namespace
    install_dependencies
    deploy_database
    deploy_redis
    deploy_elasticsearch
    deploy_application
    setup_monitoring
    verify_deployment
    
    log_info "Kubernetes部署完成！"
    
    # 显示访问信息
    echo ""
    echo "应用访问地址："
    kubectl get ingress -n $NAMESPACE
    echo ""
    echo "查看Pod状态: kubectl get pods -n $NAMESPACE"
    echo "查看服务日志: kubectl logs -f deployment/api-server -n $NAMESPACE"
    echo "进入Pod调试: kubectl exec -it deployment/api-server -n $NAMESPACE -- /bin/bash"
}

# 错误处理
trap 'log_error "Kubernetes部署失败"; exit 1' ERR

# 执行部署
main "$@"
```

## ☁️ 云平台部署

### AWS EKS部署

```bash
#!/bin/bash
# deploy-aws-eks.sh

# AWS EKS部署脚本
CLUSTER_NAME="library-management-prod"
REGION="us-west-2"
NODE_GROUP_NAME="library-workers"

# 创建EKS集群
create_eks_cluster() {
    log_info "创建EKS集群..."
    
    eksctl create cluster \
        --name $CLUSTER_NAME \
        --region $REGION \
        --version 1.28 \
        --nodegroup-name $NODE_GROUP_NAME \
        --node-type m5.xlarge \
        --nodes 3 \
        --nodes-min 2 \
        --nodes-max 10 \
        --managed \
        --enable-ssm \
        --ssh-access \
        --ssh-public-key ~/.ssh/id_rsa.pub
}

# 配置AWS Load Balancer Controller
setup_aws_load_balancer() {
    log_info "配置AWS Load Balancer Controller..."
    
    # 创建IAM OIDC提供者
    eksctl utils associate-iam-oidc-provider \
        --region $REGION \
        --cluster $CLUSTER_NAME \
        --approve
    
    # 创建IAM角色
    eksctl create iamserviceaccount \
        --cluster=$CLUSTER_NAME \
        --namespace=kube-system \
        --name=aws-load-balancer-controller \
        --attach-policy-arn=arn:aws:iam::aws:policy/ElasticLoadBalancingFullAccess \
        --override-existing-serviceaccounts \
        --approve
    
    # 安装Load Balancer Controller
    helm repo add eks https://aws.github.io/eks-charts
    helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
        -n kube-system \
        --set clusterName=$CLUSTER_NAME \
        --set serviceAccount.create=false \
        --set serviceAccount.name=aws-load-balancer-controller
}

# 配置EBS CSI驱动
setup_ebs_csi() {
    log_info "配置EBS CSI驱动..."
    
    eksctl create iamserviceaccount \
        --name ebs-csi-controller-sa \
        --namespace kube-system \
        --cluster $CLUSTER_NAME \
        --attach-policy-arn arn:aws:iam::aws:policy/service-role/Amazon_EBS_CSI_DriverPolicy \
        --approve
    
    eksctl create addon \
        --name aws-ebs-csi-driver \
        --cluster $CLUSTER_NAME \
        --service-account-role-arn arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/eksctl-$CLUSTER_NAME-addon-iamserviceaccount-kube-system-ebs-csi-controller-sa-Role
}

# 主执行流程
main() {
    create_eks_cluster
    setup_aws_load_balancer
    setup_ebs_csi
    
    # 更新kubeconfig
    aws eks update-kubeconfig --region $REGION --name $CLUSTER_NAME
    
    log_info "EKS集群创建完成"
}

main "$@"
```

### Azure AKS部署

```bash
#!/bin/bash
# deploy-azure-aks.sh

# Azure AKS部署脚本
RESOURCE_GROUP="library-management-rg"
CLUSTER_NAME="library-management-aks"
LOCATION="eastus"

# 创建资源组
az group create --name $RESOURCE_GROUP --location $LOCATION

# 创建AKS集群
az aks create \
    --resource-group $RESOURCE_GROUP \
    --name $CLUSTER_NAME \
    --node-count 3 \
    --node-vm-size Standard_D4s_v3 \
    --enable-cluster-autoscaler \
    --min-count 2 \
    --max-count 10 \
    --generate-ssh-keys \
    --enable-managed-identity \
    --enable-addons monitoring \
    --kubernetes-version 1.28.0

# 获取凭据
az aks get-credentials --resource-group $RESOURCE_GROUP --name $CLUSTER_NAME

# 安装NGINX Ingress
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install ingress-nginx ingress-nginx/ingress-nginx \
    --create-namespace \
    --namespace ingress-nginx \
    --set controller.service.annotations."service\.beta\.kubernetes\.io/azure-load-balancer-health-probe-request-path"=/healthz
```

## 🔗 相关文档

- [Docker部署指南](./docker-guide.md)
- [Kubernetes运维手册](./kubernetes-operations.md)
- [监控配置指南](./monitoring-setup.md)
- [安全配置指南](./security-configuration.md)
- [故障排除手册](./troubleshooting.md)
- [性能调优指南](./performance-tuning.md)

---

⚠️ **生产部署提醒**:
- 部署前务必进行充分的测试验证
- 确保所有安全配置都已正确设置
- 建立完善的监控和告警机制
- 制定详细的备份和恢复计划