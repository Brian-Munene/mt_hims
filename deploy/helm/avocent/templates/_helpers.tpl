{{- define "avocent.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "avocent.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{- define "avocent.labels" -}}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
app.kubernetes.io/name: {{ include "avocent.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{- define "avocent.selectorLabels" -}}
app.kubernetes.io/name: {{ include "avocent.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{- define "avocent.postgresHost" -}}
{{- if .Values.postgres.internal -}}
{{ include "avocent.fullname" . }}-postgres
{{- else -}}
{{ required "postgres.host is required when postgres.internal is false" .Values.postgres.host }}
{{- end -}}
{{- end -}}

{{- define "avocent.redisUrl" -}}
{{- if .Values.redis.internal -}}
redis://{{ include "avocent.fullname" . }}-redis:6379/0
{{- else -}}
{{ required "redis.url is required when redis.internal is false" .Values.redis.url }}
{{- end -}}
{{- end -}}

{{- define "avocent.webService" -}}
{{ include "avocent.fullname" . }}-web
{{- end -}}

{{- define "avocent.allowedHosts" -}}
{{- $hosts := list "localhost" "127.0.0.1" (include "avocent.webService" .) -}}
{{- if .Values.ingress.apiHost -}}
{{- $hosts = append $hosts .Values.ingress.apiHost -}}
{{- end -}}
{{- $hosts = concat $hosts .Values.django.allowedHosts -}}
{{- $hosts | uniq | join "," -}}
{{- end -}}

{{/* Shared env for the Django containers (web, worker, beat). */}}
{{- define "avocent.backendEnvFrom" -}}
envFrom:
  - configMapRef:
      name: {{ include "avocent.fullname" . }}-backend
  - secretRef:
      name: {{ include "avocent.fullname" . }}-backend
{{- end -}}
