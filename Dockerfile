FROM node:22.19.0-alpine AS frontend

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM maven:3.9.11-eclipse-temurin-17 AS backend

WORKDIR /workspace
COPY pom.xml mvnw ./
COPY .mvn .mvn
RUN ./mvnw -B dependency:go-offline
COPY src src
COPY --from=frontend /app/src/main/resources/static/ui src/main/resources/static/ui
RUN ./mvnw -B -DskipTests package

FROM eclipse-temurin:17-jre

WORKDIR /app
RUN useradd --create-home --uid 1001 appuser \
    && mkdir -p /app/storage \
    && chown -R appuser:appuser /app

COPY --from=backend --chown=appuser:appuser /workspace/target/*.jar app.jar
COPY --chown=appuser:appuser docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod 0755 /usr/local/bin/docker-entrypoint.sh

USER appuser
EXPOSE 8080

ENTRYPOINT ["docker-entrypoint.sh"]
