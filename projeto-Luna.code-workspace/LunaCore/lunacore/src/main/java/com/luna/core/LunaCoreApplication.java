package com.luna.core;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

import com.luna.core.proxy.config.TotemApiProperties;

@SpringBootApplication
@EnableConfigurationProperties(TotemApiProperties.class)
public class LunaCoreApplication {

    public static void main(String[] args) {
        SpringApplication.run(LunaCoreApplication.class, args);
    }
}
