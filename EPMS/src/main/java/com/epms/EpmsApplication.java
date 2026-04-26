package com.epms;

import com.epms.config.DotEnvLoader;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class EpmsApplication {

	public static void main(String[] args) {
		DotEnvLoader.load();
		SpringApplication.run(EpmsApplication.class, args);
	}
}
