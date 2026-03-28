# LunaCore - Authentication Service
# Multi-stage build for optimal image size

# Stage 1: Build
FROM eclipse-temurin:21.0.2_13-jdk-alpine AS build
WORKDIR /app

# Install Maven
RUN apk add --no-cache maven

# Copy pom first for better layer caching
COPY pom.xml ./

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

# Create logs directory with proper permissions
RUN mkdir -p /app/logs && chown -R spring:spring /app/logs

USER spring:spring

# Copy jar from build stage
COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:InitialRAMPercentage=10.0", \
  "-XX:MaxRAMPercentage=50.0", \
  "-XX:+UseG1GC", \
  "-XX:MaxGCPauseMillis=100", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-Dserver.shutdown=graceful", \
  "-jar", "app.jar"]
