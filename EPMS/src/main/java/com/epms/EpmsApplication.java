package com.epms;

import com.epms.config.DotEnvLoader;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class EpmsApplication {

	public static void main(String[] args) {
		DotEnvLoader.load();
		SpringApplication.run(EpmsApplication.class, args);
	}
}
