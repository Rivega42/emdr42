# Kubernetes Deployment — Setup Guide для Вики

Полная инструкция по развёртыванию EMDR-AI в Kubernetes.

---

## 1. Выбрать cloud provider

**Рекомендую для MVP:**
- **DigitalOcean Kubernetes (DOKS)** — $10/мес control plane, самое дешёвое
- **Hetzner Cloud + k3s** — ещё дешевле, но больше ручной работы

**Для production (enterprise):**
- **AWS EKS** — с RDS/ElastiCache для managed DB
- **GCP GKE Autopilot** — serverless K8s
- **Azure AKS** — если уже инвестированы в MS ecosystem

## 2. Создать cluster

### DigitalOcean пример
```bash
doctl kubernetes cluster create emdr42-prod \
  --region fra1 \
  --version 1.28 \
  --count 3 \
  --size s-2vcpu-4gb \
  --ha=true

# Загрузить kubeconfig
doctl kubernetes cluster kubeconfig save emdr42-prod
```

### AWS EKS пример (с eksctl)
```bash
eksctl create cluster \
  --name emdr42-prod \
  --region eu-central-1 \
  --nodegroup-name workers \
  --node-type t3.medium \
  --nodes 3 \
  --nodes-min 2 \
  --nodes-max 10 \
  --managed
```

## 3. Установить pre-reqs

### 3.1 Ingress controller
```bash
helm upgrade --install ingress-nginx ingress-nginx \
  --repo https://kubernetes.github.io/ingress-nginx \
  --namespace ingress-nginx --create-namespace
```

### 3.2 cert-manager (для Let's Encrypt TLS)
```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.15.0/cert-manager.yaml

# ClusterIssuer
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    email: admin@emdr42.com
    server: https://acme-v02.api.letsencrypt.org/directory
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
EOF
```

### 3.3 metrics-server (для HPA)
Обычно установлен на managed K8s. Если нет:
```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

## 4. Создать namespace и secrets

```bash
kubectl create namespace emdr42
kubectl create namespace emdr42-staging  # для staging environment

# Создать секреты (⚠️ только один раз, храните offline backup!)
POSTGRES_PASS=$(openssl rand -base64 24)
JWT_SECRET=$(openssl rand -base64 48)
PHI_KEY=$(openssl rand -base64 48)

kubectl create secret generic emdr42-secrets -n emdr42 \
  --from-literal=POSTGRES_PASSWORD="$POSTGRES_PASS" \
  --from-literal=DATABASE_URL="postgresql://emdr42:$POSTGRES_PASS@postgres:5432/emdr42?connection_limit=20&pool_timeout=10" \
  --from-literal=REDIS_URL="redis://redis:6379" \
  --from-literal=JWT_SECRET="$JWT_SECRET" \
  --from-literal=PHI_ENCRYPTION_KEY="$PHI_KEY" \
  --from-literal=LIVEKIT_API_KEY="$(openssl rand -base64 24)" \
  --from-literal=LIVEKIT_API_SECRET="$(openssl rand -base64 32)" \
  --from-literal=STRIPE_SECRET_KEY="" \
  --from-literal=STRIPE_WEBHOOK_SECRET="" \
  --from-literal=SMTP_HOST="" \
  --from-literal=SMTP_USER="" \
  --from-literal=SMTP_PASS="" \
  --from-literal=ANTHROPIC_API_KEY="" \
  --from-literal=OPENAI_API_KEY=""

# По мере подключения провайдеров — добавлять значения через
# kubectl edit secret emdr42-secrets -n emdr42
```

**СОХРАНИТЕ** эти пароли в password manager. POSTGRES_PASSWORD, PHI_ENCRYPTION_KEY — невозможно восстановить, потеря = потеря данных.

## 5. Build + Push Docker images

Настроить GitHub Container Registry (или DockerHub):
```bash
# GitHub PAT с write:packages scope
echo $CR_PAT | docker login ghcr.io -u $GITHUB_USER --password-stdin

# Build
docker build -t ghcr.io/rivega42/emdr42-api:v1.0.0 -f services/api/Dockerfile services/api
docker build -t ghcr.io/rivega42/emdr42-orchestrator:v1.0.0 -f services/orchestrator/Dockerfile services/orchestrator
docker build -t ghcr.io/rivega42/emdr42-frontend:v1.0.0 .

# Push
docker push ghcr.io/rivega42/emdr42-api:v1.0.0
docker push ghcr.io/rivega42/emdr42-orchestrator:v1.0.0
docker push ghcr.io/rivega42/emdr42-frontend:v1.0.0
```

Либо настроить GitHub Actions workflow (docker.yml) — уже есть в `.github/workflows/`.

## 6. Применить манифесты

```bash
# Staging
kubectl apply -k k8s/overlays/staging

# Подождать pods ready
kubectl get pods -n emdr42-staging -w

# Проверить logs
kubectl logs -n emdr42-staging deploy/api
kubectl logs -n emdr42-staging deploy/orchestrator
```

## 7. Миграции БД

Миграции применяются автоматом в api contiainer через docker-entrypoint.sh. Первый запуск может занять ~30-60 сек.

Если нужно применить вручную:
```bash
kubectl exec -n emdr42 deploy/api -- npx prisma migrate deploy
```

## 8. DNS

Создать A-записи в DNS-провайдере:
- `emdr42.com` → IP ingress-controller LoadBalancer
- `api.emdr42.com` → тот же IP
- `ws.emdr42.com` → тот же IP

Найти IP:
```bash
kubectl get svc -n ingress-nginx
```

## 9. Проверка

```bash
# Healthcheck
curl https://api.emdr42.com/healthz

# Readiness
curl https://api.emdr42.com/readyz

# Swagger
open https://api.emdr42.com/api/docs
```

## 10. Managed services вместо self-hosted

**Для prod строго рекомендую:**

### PostgreSQL
Заменить StatefulSet на managed:
- AWS RDS PostgreSQL
- Google Cloud SQL
- DigitalOcean Managed Database
- Azure Database for PostgreSQL

Из манифестов убрать `postgres.yaml`, обновить `DATABASE_URL` на managed endpoint.

### Redis
- AWS ElastiCache
- GCP Memorystore
- DigitalOcean Managed Redis

### Object storage (recordings)
- S3 / DigitalOcean Spaces / GCS
- Заменить MinIO deployment на cloud bucket

## 11. Observability

**Минимум для MVP:**
```bash
# Prometheus + Grafana stack
helm upgrade --install kube-prometheus kube-prometheus-stack \
  --repo https://prometheus-community.github.io/helm-charts \
  --namespace monitoring --create-namespace

# Доступ к Grafana
kubectl port-forward -n monitoring svc/kube-prometheus-grafana 3000:80
# Default: admin / prom-operator
```

**Enterprise (см. #138):**
- Loki для логов
- Prometheus exporters (postgres, redis)
- AlertManager + PagerDuty integration

## 12. CI/CD

После первого ручного деплоя — автоматизировать через GitHub Actions:

`.github/workflows/deploy.yml` (добавить):
```yaml
name: Deploy
on:
  push:
    tags: ['v*']
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - name: Build + Push
        run: |
          docker build -t ghcr.io/rivega42/emdr42-api:$GITHUB_REF_NAME -f services/api/Dockerfile services/api
          docker push ghcr.io/rivega42/emdr42-api:$GITHUB_REF_NAME
          # ... остальные services
      - name: Update K8s
        run: |
          kubectl --kubeconfig <(echo "$KUBECONFIG_B64" | base64 -d) \
            set image deployment/api api=ghcr.io/rivega42/emdr42-api:$GITHUB_REF_NAME -n emdr42
        env:
          KUBECONFIG_B64: ${{ secrets.KUBECONFIG_B64 }}
```

## 13. Backup strategy

Обязательно настроить **до** первых реальных пользователей. См. #137.

## 14. Чек-лист перед production launch

- [ ] Managed PostgreSQL с auto-backup
- [ ] Managed Redis
- [ ] TLS сертификаты (Let's Encrypt)
- [ ] WAF / DDoS protection (Cloudflare front)
- [ ] Monitoring (Prometheus + Grafana)
- [ ] Log aggregation (Loki или cloud)
- [ ] Alerts настроены + pager
- [ ] Backup tested (restore drill)
- [ ] Pen-test пройден
- [ ] HIPAA BAA signed (если US)
- [ ] GDPR DPA signed (если EU)
- [ ] Legal docs finalized
- [ ] On-call rotation настроен
- [ ] Incident Response plan прочитан командой (docs/INCIDENT_RESPONSE.md)

## Support

Вопросы по deployment — в issue #136 или contact CTO.
