# TotemAPI - Clinical Data Service
# Multi-stage build for optimal image size

# Stage 1: Build
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /app

# Copy pom.xml first to leverage Docker layer caching
COPY pom.xml .

# Download dependencies (cached layer)
RUN mvn -B dependency:go-offline || true

# Copy source code
COPY src ./src

# Build application (skip tests for faster builds)
RUN mvn -B clean package -DskipTests

# Stage 2: Runtime
FROM eclipse-temurin:21.0.2_13-jre-alpine
WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl

# Create non-root user for security
RUN addgroup -S spring && adduser -S spring -G spring

# Create logs and uploads directories with proper permissions
RUN mkdir -p /app/logs /app/uploads && chown -R spring:spring /app/logs /app/uploads

USER spring:spring

# Copy jar from build stage
COPY --from=build /app/target/*.jar app.jar

ENV SPRING_PROFILES_ACTIVE=prod
ENV JAVA_TOOL_OPTIONS="-Xms96m -Xmx256m -XX:MaxMetaspaceSize=128m -XX:ReservedCodeCacheSize=64m -XX:+UseSerialGC -XX:+ExitOnOutOfMemoryError -Djava.security.egd=file:/dev/./urandom -Dfile.encoding=UTF-8"

EXPOSE 8081

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8081/api/health || exit 1

# Optimized for small containers; JAVA_TOOL_OPTIONS remains overridable by the platform.
ENTRYPOINT ["java", "-Dserver.shutdown=graceful", "-jar", "app.jar"]
