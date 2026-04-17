# Kubernetes Manifests — EMDR-AI

Kustomize-based configuration для deployment в Kubernetes.

## Структура

```
k8s/
├── base/              # Общие манифесты
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── secrets.example.yaml  (не применять в прод как есть)
│   ├── api.yaml
│   ├── orchestrator.yaml
│   ├── frontend.yaml
│   ├── postgres.yaml
│   ├── redis.yaml
│   ├── ingress.yaml
│   ├── network-policy.yaml
│   └── kustomization.yaml
└── overlays/
    ├── dev/
    ├── staging/       # replicas=1
    └── prod/          # replicas=3, image tags=v1.0.0
```

## Применение

```bash
# Dry-run проверка
kubectl apply -k k8s/overlays/staging --dry-run=client

# Staging
kubectl apply -k k8s/overlays/staging

# Prod
kubectl apply -k k8s/overlays/prod
```

## Обязательные pre-reqs

1. Kubernetes cluster (EKS / GKE / AKS / self-managed 1.28+)
2. `ingress-nginx` controller установлен
3. `cert-manager` + ClusterIssuer `letsencrypt-prod`
4. `metrics-server` (для HPA)
5. Secrets созданы (см. SETUP.md)

## Для команды Вики — полные инструкции в `SETUP.md`.
