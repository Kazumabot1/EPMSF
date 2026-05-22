-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: localhost    Database: epms
-- ------------------------------------------------------
-- Server version	8.0.43

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `appraisal_cycle`
--

DROP TABLE IF EXISTS `appraisal_cycle`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `appraisal_cycle` (
  `id` int NOT NULL AUTO_INCREMENT,
  `activated_at` datetime(6) DEFAULT NULL,
  `completed_at` datetime(6) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `cycle_name` varchar(180) NOT NULL,
  `cycle_type` enum('ANNUAL','SEMI_ANNUAL','CUSTOM') NOT NULL,
  `cycle_year` int NOT NULL,
  `description` text,
  `end_date` date NOT NULL,
  `locked` bit(1) NOT NULL,
  `period_no` int NOT NULL,
  `start_date` date NOT NULL,
  `status` enum('DRAFT','ACTIVE','LOCKED','COMPLETED') NOT NULL,
  `submission_deadline` date NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `created_by_user_id` int DEFAULT NULL,
  `template_id` int NOT NULL,
  `dept_head_submission_deadline` date DEFAULT NULL,
  `manager_submission_deadline` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FKpr6d1yxrn765qtqii2q27f568` (`created_by_user_id`),
  KEY `FKdlnsd6yu2qyfbwnq98fpa8fa` (`template_id`),
  CONSTRAINT `FKdlnsd6yu2qyfbwnq98fpa8fa` FOREIGN KEY (`template_id`) REFERENCES `appraisal_form_template` (`id`),
  CONSTRAINT `FKpr6d1yxrn765qtqii2q27f568` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `appraisal_cycle`
--

LOCK TABLES `appraisal_cycle` WRITE;
/*!40000 ALTER TABLE `appraisal_cycle` DISABLE KEYS */;
/*!40000 ALTER TABLE `appraisal_cycle` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `appraisal_cycle_department`
--

DROP TABLE IF EXISTS `appraisal_cycle_department`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `appraisal_cycle_department` (
  `id` int NOT NULL AUTO_INCREMENT,
  `cycle_id` int NOT NULL,
  `department_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_appraisal_cycle_department` (`cycle_id`,`department_id`),
  KEY `FKhglm09i5o8yfbcs999htl5j1w` (`department_id`),
  CONSTRAINT `FKhglm09i5o8yfbcs999htl5j1w` FOREIGN KEY (`department_id`) REFERENCES `department` (`id`),
  CONSTRAINT `FKr25yvv3o9yar96xekmei0mtb2` FOREIGN KEY (`cycle_id`) REFERENCES `appraisal_cycle` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `appraisal_cycle_department`
--

LOCK TABLES `appraisal_cycle_department` WRITE;
/*!40000 ALTER TABLE `appraisal_cycle_department` DISABLE KEYS */;
/*!40000 ALTER TABLE `appraisal_cycle_department` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `appraisal_form_criteria`
--

DROP TABLE IF EXISTS `appraisal_form_criteria`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `appraisal_form_criteria` (
  `id` int NOT NULL AUTO_INCREMENT,
  `active` bit(1) NOT NULL,
  `criteria_text` text NOT NULL,
  `description` text,
  `max_rating` int NOT NULL,
  `rating_required` bit(1) NOT NULL,
  `sort_order` int NOT NULL,
  `section_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKs6l5j3f7mprp4dmb5f29u5229` (`section_id`),
  CONSTRAINT `FKs6l5j3f7mprp4dmb5f29u5229` FOREIGN KEY (`section_id`) REFERENCES `appraisal_section` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `appraisal_form_criteria`
--

LOCK TABLES `appraisal_form_criteria` WRITE;
/*!40000 ALTER TABLE `appraisal_form_criteria` DISABLE KEYS */;
/*!40000 ALTER TABLE `appraisal_form_criteria` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `appraisal_form_template`
--

DROP TABLE IF EXISTS `appraisal_form_template`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `appraisal_form_template` (
  `id` int NOT NULL AUTO_INCREMENT,
  `appraisee_signature_id` bigint DEFAULT NULL,
  `appraiser_signature_id` bigint DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `cycle_specific_copy` bit(1) NOT NULL,
  `description` text,
  `form_type` enum('ANNUAL','SEMI_ANNUAL','CUSTOM') NOT NULL,
  `hr_signature_id` bigint DEFAULT NULL,
  `signature_date_format` varchar(20) DEFAULT NULL,
  `status` enum('DRAFT','ACTIVE','ARCHIVED') NOT NULL,
  `target_all_departments` bit(1) NOT NULL,
  `template_name` varchar(180) NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `version_no` int NOT NULL,
  `created_by_user_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FKbiqsi6pe34m2s663ovhfvgt5c` (`created_by_user_id`),
  CONSTRAINT `FKbiqsi6pe34m2s663ovhfvgt5c` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `appraisal_form_template`
--

LOCK TABLES `appraisal_form_template` WRITE;
/*!40000 ALTER TABLE `appraisal_form_template` DISABLE KEYS */;
/*!40000 ALTER TABLE `appraisal_form_template` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `appraisal_review`
--

DROP TABLE IF EXISTS `appraisal_review`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `appraisal_review` (
  `id` int NOT NULL AUTO_INCREMENT,
  `comment` text,
  `created_at` datetime(6) NOT NULL,
  `decision` enum('SUBMITTED','APPROVED','RETURNED','REJECTED') NOT NULL,
  `recommendation` text,
  `review_stage` enum('PM','DEPT_HEAD','HR') NOT NULL,
  `signature_image_data` longtext,
  `signature_image_type` varchar(80) DEFAULT NULL,
  `submitted_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `employee_appraisal_form_id` int NOT NULL,
  `reviewer_user_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_appraisal_review_form_stage` (`employee_appraisal_form_id`,`review_stage`),
  KEY `FKego6hms3jeu7dhv7eq9t6j2vs` (`reviewer_user_id`),
  CONSTRAINT `FK16lpj94uojky6e0u1thns1j9c` FOREIGN KEY (`employee_appraisal_form_id`) REFERENCES `employee_appraisal_form` (`id`),
  CONSTRAINT `FKego6hms3jeu7dhv7eq9t6j2vs` FOREIGN KEY (`reviewer_user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `appraisal_review`
--

LOCK TABLES `appraisal_review` WRITE;
/*!40000 ALTER TABLE `appraisal_review` DISABLE KEYS */;
/*!40000 ALTER TABLE `appraisal_review` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `appraisal_score_band`
--

DROP TABLE IF EXISTS `appraisal_score_band`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `appraisal_score_band` (
  `id` int NOT NULL AUTO_INCREMENT,
  `active` bit(1) NOT NULL,
  `description` text,
  `label` varchar(100) NOT NULL,
  `max_score` int NOT NULL,
  `min_score` int NOT NULL,
  `sort_order` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `appraisal_score_band`
--

LOCK TABLES `appraisal_score_band` WRITE;
/*!40000 ALTER TABLE `appraisal_score_band` DISABLE KEYS */;
/*!40000 ALTER TABLE `appraisal_score_band` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `appraisal_section`
--

DROP TABLE IF EXISTS `appraisal_section`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `appraisal_section` (
  `id` int NOT NULL AUTO_INCREMENT,
  `active` bit(1) NOT NULL,
  `description` text,
  `section_name` varchar(180) NOT NULL,
  `sort_order` int NOT NULL,
  `template_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKa1dhmqq0twqelb5f0vvxwyei4` (`template_id`),
  CONSTRAINT `FKa1dhmqq0twqelb5f0vvxwyei4` FOREIGN KEY (`template_id`) REFERENCES `appraisal_form_template` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `appraisal_section`
--

LOCK TABLES `appraisal_section` WRITE;
/*!40000 ALTER TABLE `appraisal_section` DISABLE KEYS */;
/*!40000 ALTER TABLE `appraisal_section` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `appraisal_template_department`
--

DROP TABLE IF EXISTS `appraisal_template_department`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `appraisal_template_department` (
  `id` int NOT NULL AUTO_INCREMENT,
  `department_id` int NOT NULL,
  `template_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_appraisal_template_department` (`template_id`,`department_id`),
  KEY `FKkchplgeqwtf3gyxyj4eg60ypn` (`department_id`),
  CONSTRAINT `FKkchplgeqwtf3gyxyj4eg60ypn` FOREIGN KEY (`department_id`) REFERENCES `department` (`id`),
  CONSTRAINT `FKp85mmiv685o0ur8f8jw9819ao` FOREIGN KEY (`template_id`) REFERENCES `appraisal_form_template` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `appraisal_template_department`
--

LOCK TABLES `appraisal_template_department` WRITE;
/*!40000 ALTER TABLE `appraisal_template_department` DISABLE KEYS */;
/*!40000 ALTER TABLE `appraisal_template_department` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `appraisal_template_score_band`
--

DROP TABLE IF EXISTS `appraisal_template_score_band`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `appraisal_template_score_band` (
  `id` int NOT NULL AUTO_INCREMENT,
  `active` bit(1) NOT NULL,
  `description` text,
  `label` varchar(100) NOT NULL,
  `max_score` int NOT NULL,
  `min_score` int NOT NULL,
  `sort_order` int NOT NULL,
  `template_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKjbw9qhsasvlpcx0txk2mqqoah` (`template_id`),
  CONSTRAINT `FKjbw9qhsasvlpcx0txk2mqqoah` FOREIGN KEY (`template_id`) REFERENCES `appraisal_form_template` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `appraisal_template_score_band`
--

LOCK TABLES `appraisal_template_score_band` WRITE;
/*!40000 ALTER TABLE `appraisal_template_score_band` DISABLE KEYS */;
/*!40000 ALTER TABLE `appraisal_template_score_band` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `assessment_form_questions`
--

DROP TABLE IF EXISTS `assessment_form_questions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `assessment_form_questions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `question_text` text NOT NULL,
  `is_required` bit(1) NOT NULL,
  `response_type` varchar(30) NOT NULL,
  `weight` double NOT NULL,
  `section_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKqnit6dvmbfsxrog36pcgjlodg` (`section_id`),
  CONSTRAINT `FKqnit6dvmbfsxrog36pcgjlodg` FOREIGN KEY (`section_id`) REFERENCES `assessment_form_sections` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `assessment_form_questions`
--

LOCK TABLES `assessment_form_questions` WRITE;
/*!40000 ALTER TABLE `assessment_form_questions` DISABLE KEYS */;
/*!40000 ALTER TABLE `assessment_form_questions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `assessment_form_score_bands`
--

DROP TABLE IF EXISTS `assessment_form_score_bands`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `assessment_form_score_bands` (
  `id` int NOT NULL AUTO_INCREMENT,
  `description` text,
  `label` varchar(100) NOT NULL,
  `max_score` int NOT NULL,
  `min_score` int NOT NULL,
  `sort_order` int NOT NULL,
  `form_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKsm876cea5orp361hykipvx8lb` (`form_id`),
  CONSTRAINT `FKsm876cea5orp361hykipvx8lb` FOREIGN KEY (`form_id`) REFERENCES `assessment_forms` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `assessment_form_score_bands`
--

LOCK TABLES `assessment_form_score_bands` WRITE;
/*!40000 ALTER TABLE `assessment_form_score_bands` DISABLE KEYS */;
/*!40000 ALTER TABLE `assessment_form_score_bands` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `assessment_form_sections`
--

DROP TABLE IF EXISTS `assessment_form_sections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `assessment_form_sections` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_no` int NOT NULL,
  `title` varchar(180) NOT NULL,
  `form_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKkr81olmi6ul6ibtb0o66q4kxr` (`form_id`),
  CONSTRAINT `FKkr81olmi6ul6ibtb0o66q4kxr` FOREIGN KEY (`form_id`) REFERENCES `assessment_forms` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `assessment_form_sections`
--

LOCK TABLES `assessment_form_sections` WRITE;
/*!40000 ALTER TABLE `assessment_form_sections` DISABLE KEYS */;
/*!40000 ALTER TABLE `assessment_form_sections` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `assessment_form_target_departments`
--

DROP TABLE IF EXISTS `assessment_form_target_departments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `assessment_form_target_departments` (
  `form_id` int NOT NULL,
  `department_id` int NOT NULL,
  KEY `FKmjrb9rk7xntne85uc7t5fghss` (`form_id`),
  CONSTRAINT `FKmjrb9rk7xntne85uc7t5fghss` FOREIGN KEY (`form_id`) REFERENCES `assessment_forms` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `assessment_form_target_departments`
--

LOCK TABLES `assessment_form_target_departments` WRITE;
/*!40000 ALTER TABLE `assessment_form_target_departments` DISABLE KEYS */;
/*!40000 ALTER TABLE `assessment_form_target_departments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `assessment_form_target_roles`
--

DROP TABLE IF EXISTS `assessment_form_target_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `assessment_form_target_roles` (
  `form_id` int NOT NULL,
  `target_role` varchar(60) NOT NULL,
  KEY `FK72khsfufd3nmjxo6cj2ki501q` (`form_id`),
  CONSTRAINT `FK72khsfufd3nmjxo6cj2ki501q` FOREIGN KEY (`form_id`) REFERENCES `assessment_forms` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `assessment_form_target_roles`
--

LOCK TABLES `assessment_form_target_roles` WRITE;
/*!40000 ALTER TABLE `assessment_form_target_roles` DISABLE KEYS */;
/*!40000 ALTER TABLE `assessment_form_target_roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `assessment_forms`
--

DROP TABLE IF EXISTS `assessment_forms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `assessment_forms` (
  `id` int NOT NULL AUTO_INCREMENT,
  `is_active` bit(1) NOT NULL,
  `company_name` varchar(180) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `description` text,
  `end_date` date NOT NULL,
  `form_name` varchar(180) NOT NULL,
  `start_date` date NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `assessment_forms`
--

LOCK TABLES `assessment_forms` WRITE;
/*!40000 ALTER TABLE `assessment_forms` DISABLE KEYS */;
/*!40000 ALTER TABLE `assessment_forms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `action` varchar(255) DEFAULT NULL,
  `changed_column` varchar(255) DEFAULT NULL,
  `entity_id` int DEFAULT NULL,
  `entity_type` varchar(255) DEFAULT NULL,
  `new_value` text,
  `old_value` text,
  `reason` varchar(150) DEFAULT NULL,
  `timestamp` datetime(6) DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `continuous_feedback`
--

DROP TABLE IF EXISTS `continuous_feedback`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `continuous_feedback` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category` varchar(50) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `feedback_text` text NOT NULL,
  `rating` int DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `employee_id` int NOT NULL,
  `giver_user_id` int NOT NULL,
  `team_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK76absyh67j31ryu4qbxct13hq` (`employee_id`),
  KEY `FKkgbgy3qbx1n57tm2vb1qj8vl4` (`giver_user_id`),
  KEY `FKmeeum7fg0s9040bqdpgc8wgp5` (`team_id`),
  CONSTRAINT `FK76absyh67j31ryu4qbxct13hq` FOREIGN KEY (`employee_id`) REFERENCES `employee` (`id`),
  CONSTRAINT `FKkgbgy3qbx1n57tm2vb1qj8vl4` FOREIGN KEY (`giver_user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `FKmeeum7fg0s9040bqdpgc8wgp5` FOREIGN KEY (`team_id`) REFERENCES `team` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `continuous_feedback`
--

LOCK TABLES `continuous_feedback` WRITE;
/*!40000 ALTER TABLE `continuous_feedback` DISABLE KEYS */;
INSERT INTO `continuous_feedback` VALUES (1,'Positive','2026-05-20 14:56:23.813301','1. CONTINUOUS FEEDBACK. So, Good',1,'2026-05-20 14:56:23.813301',22,19,NULL);
/*!40000 ALTER TABLE `continuous_feedback` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `department`
--

DROP TABLE IF EXISTS `department`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `department` (
  `id` int NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `created_by` varchar(255) DEFAULT NULL,
  `department_code` varchar(255) DEFAULT NULL,
  `department_name` varchar(255) NOT NULL,
  `head_employee` varchar(255) DEFAULT NULL,
  `status` bit(1) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_f5np34wnxt905fwmrs6133l28` (`department_name`),
  UNIQUE KEY `UK_tc0vggvvuqc22trtdy0dmrahh` (`department_code`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `department`
--

LOCK TABLES `department` WRITE;
/*!40000 ALTER TABLE `department` DISABLE KEYS */;
INSERT INTO `department` VALUES (1,'2026-05-20 14:47:51.000000','seed-data','BNK','Banking',NULL,_binary ''),(2,'2026-05-20 14:47:51.000000','seed-data','TST','Test Department',NULL,_binary ''),(3,'2026-05-20 14:47:51.000000','seed-data','HR','Human Resources',NULL,_binary ''),(4,'2026-05-20 14:47:51.000000','seed-data','IT','Information Technology',NULL,_binary ''),(5,'2026-05-20 14:47:51.000000','seed-data','FIN','Finance & Accounting',NULL,_binary ''),(6,'2026-05-20 14:47:51.000000','seed-data','MKT','Marketing & Sales',NULL,_binary ''),(7,'2026-05-20 14:47:51.000000','seed-data','OPS','Operations',NULL,_binary ''),(8,'2026-05-20 14:47:51.000000','seed-data','LGL','Legal & Compliance',NULL,_binary ''),(9,'2026-05-20 14:47:51.000000','seed-data','CS','Customer Service',NULL,_binary '');
/*!40000 ALTER TABLE `department` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employee`
--

DROP TABLE IF EXISTS `employee`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee` (
  `id` int NOT NULL AUTO_INCREMENT,
  `active` bit(1) DEFAULT NULL,
  `contact_address` varchar(255) DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `father_name` varchar(255) DEFAULT NULL,
  `father_nrc` varchar(255) DEFAULT NULL,
  `first_name` varchar(255) DEFAULT NULL,
  `gender` varchar(255) DEFAULT NULL,
  `last_name` varchar(255) DEFAULT NULL,
  `marital_status` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `permanent_address` varchar(255) DEFAULT NULL,
  `phone_number` varchar(255) DEFAULT NULL,
  `race` varchar(255) DEFAULT NULL,
  `religion` varchar(255) DEFAULT NULL,
  `spouse_name` varchar(255) DEFAULT NULL,
  `spouse_nrc` varchar(255) DEFAULT NULL,
  `staff_nrc` varchar(255) DEFAULT NULL,
  `position_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FKirla0e5n0j54wihlxctb03cc0` (`position_id`),
  CONSTRAINT `FKirla0e5n0j54wihlxctb03cc0` FOREIGN KEY (`position_id`) REFERENCES `positions` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employee`
--

LOCK TABLES `employee` WRITE;
/*!40000 ALTER TABLE `employee` DISABLE KEYS */;
INSERT INTO `employee` VALUES (15,_binary '','Seed contact address','1990-01-01','ceo@epms.local',NULL,NULL,'CEO','Male','User','Single','$2y$10$6q0YhfHefBEkSLI1zYhEyutlcGsVpVyRNY/A80Y4EbqZl97JHnHne','Seed permanent address','0900000001','Myanmar','Buddhist',NULL,NULL,NULL,36),(16,_binary '','Seed contact address','1990-01-01','admin@epms.local',NULL,NULL,'Admin','Female','User','Single','$2y$10$6q0YhfHefBEkSLI1zYhEyutlcGsVpVyRNY/A80Y4EbqZl97JHnHne','Seed permanent address','0900000002','Myanmar','Buddhist',NULL,NULL,NULL,48),(17,_binary '','Seed contact address','1990-01-01','hr@epms.local',NULL,NULL,'HR','Female','User','Single','$2y$10$6q0YhfHefBEkSLI1zYhEyutlcGsVpVyRNY/A80Y4EbqZl97JHnHne','Seed permanent address','0900000003','Myanmar','Buddhist',NULL,NULL,NULL,47),(18,_binary '','Seed contact address','1990-01-01','dh@epms.local',NULL,NULL,'Department','Male','Head','Single','$2y$10$6q0YhfHefBEkSLI1zYhEyutlcGsVpVyRNY/A80Y4EbqZl97JHnHne','Seed permanent address','0900000004','Myanmar','Buddhist',NULL,NULL,NULL,41),(19,_binary '','Seed contact address','1990-01-01','manager@epms.local',NULL,NULL,'Project','Male','Manager','Single','$2y$10$6q0YhfHefBEkSLI1zYhEyutlcGsVpVyRNY/A80Y4EbqZl97JHnHne','Seed permanent address','0900000005','Myanmar','Buddhist',NULL,NULL,NULL,51),(20,_binary '','Seed contact address','1990-01-01','teamleader@epms.local',NULL,NULL,'Team','Female','Leader','Single','$2y$10$6q0YhfHefBEkSLI1zYhEyutlcGsVpVyRNY/A80Y4EbqZl97JHnHne','Seed permanent address','0900000006','Myanmar','Buddhist',NULL,NULL,NULL,53),(21,_binary '','Seed contact address','1990-01-01','employee@epms.local',NULL,NULL,'Normal','Male','Employee','Single','$2y$10$6q0YhfHefBEkSLI1zYhEyutlcGsVpVyRNY/A80Y4EbqZl97JHnHne','Seed permanent address','0900000007','Myanmar','Buddhist',NULL,NULL,NULL,60),(22,_binary '','Seed contact address','1990-01-01','phyuphyu@gmail.com',NULL,NULL,'Phyu Phyu','Female','','Single','$2y$10$6q0YhfHefBEkSLI1zYhEyutlcGsVpVyRNY/A80Y4EbqZl97JHnHne','Seed permanent address','09xxxx','Myanmar','Buddhist',NULL,NULL,NULL,60),(23,_binary '','Seed contact address','1990-01-01','nini@gmail.com',NULL,NULL,'Ni Ni','Female','','Single','$2y$10$6q0YhfHefBEkSLI1zYhEyutlcGsVpVyRNY/A80Y4EbqZl97JHnHne','Seed permanent address','09xxxx','Myanmar','Buddhist',NULL,NULL,NULL,63),(24,_binary '','Seed contact address','1990-01-01','aungaung@gmail.com',NULL,NULL,'Aung Aung','Male','','Single','$2y$10$6q0YhfHefBEkSLI1zYhEyutlcGsVpVyRNY/A80Y4EbqZl97JHnHne','Seed permanent address','09xxxx','Myanmar','Buddhist',NULL,NULL,NULL,57),(25,_binary '','Seed contact address','1990-01-01','koko@gmail.com',NULL,NULL,'Ko Ko','Male','','Single','$2y$10$6q0YhfHefBEkSLI1zYhEyutlcGsVpVyRNY/A80Y4EbqZl97JHnHne','Seed permanent address','09xxxx','Myanmar','Buddhist',NULL,NULL,NULL,66),(26,_binary '','Seed contact address','1990-01-01','sales.manager@epms.local',NULL,NULL,'Sales','Female','Manager','Single','$2y$10$6q0YhfHefBEkSLI1zYhEyutlcGsVpVyRNY/A80Y4EbqZl97JHnHne','Seed permanent address','0900000008','Myanmar','Buddhist',NULL,NULL,NULL,50),(27,_binary '','Seed contact address','1990-01-01','sales.leader@epms.local',NULL,NULL,'Sales','Male','Leader','Single','$2y$10$6q0YhfHefBEkSLI1zYhEyutlcGsVpVyRNY/A80Y4EbqZl97JHnHne','Seed permanent address','0900000009','Myanmar','Buddhist',NULL,NULL,NULL,53),(28,_binary '','Seed contact address','1990-01-01','sales.employee@epms.local',NULL,NULL,'Sales','Female','Employee','Single','$2y$10$6q0YhfHefBEkSLI1zYhEyutlcGsVpVyRNY/A80Y4EbqZl97JHnHne','Seed permanent address','0900000010','Myanmar','Buddhist',NULL,NULL,NULL,57);
/*!40000 ALTER TABLE `employee` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employee_appraisal_criteria_rating`
--

DROP TABLE IF EXISTS `employee_appraisal_criteria_rating`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_appraisal_criteria_rating` (
  `id` int NOT NULL AUTO_INCREMENT,
  `comment` text,
  `created_at` datetime(6) NOT NULL,
  `rating_value` int NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `criteria_id` int NOT NULL,
  `employee_appraisal_form_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_employee_appraisal_criteria_rating` (`employee_appraisal_form_id`,`criteria_id`),
  KEY `FK4yuntswivevm9f119suxsw8g0` (`criteria_id`),
  CONSTRAINT `FK4yuntswivevm9f119suxsw8g0` FOREIGN KEY (`criteria_id`) REFERENCES `appraisal_form_criteria` (`id`),
  CONSTRAINT `FKhksb9tla4qosv4773ic2erus4` FOREIGN KEY (`employee_appraisal_form_id`) REFERENCES `employee_appraisal_form` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employee_appraisal_criteria_rating`
--

LOCK TABLES `employee_appraisal_criteria_rating` WRITE;
/*!40000 ALTER TABLE `employee_appraisal_criteria_rating` DISABLE KEYS */;
/*!40000 ALTER TABLE `employee_appraisal_criteria_rating` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employee_appraisal_form`
--

DROP TABLE IF EXISTS `employee_appraisal_form`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_appraisal_form` (
  `id` int NOT NULL AUTO_INCREMENT,
  `answered_criteria_count` int DEFAULT NULL,
  `assessment_date` date DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `department_name_snapshot` varchar(180) DEFAULT NULL,
  `dept_head_submitted_at` datetime(6) DEFAULT NULL,
  `effective_date` date DEFAULT NULL,
  `employee_code_snapshot` varchar(80) DEFAULT NULL,
  `employee_name_snapshot` varchar(180) DEFAULT NULL,
  `hr_approved_at` datetime(6) DEFAULT NULL,
  `locked` bit(1) NOT NULL,
  `performance_label` varchar(80) DEFAULT NULL,
  `pm_submitted_at` datetime(6) DEFAULT NULL,
  `position_snapshot` varchar(180) DEFAULT NULL,
  `score_percent` double DEFAULT NULL,
  `status` enum('PM_DRAFT','DEPT_HEAD_PENDING','HR_PENDING','COMPLETED','RETURNED','REJECTED') NOT NULL,
  `total_points` int DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `visible_to_employee` bit(1) NOT NULL,
  `cycle_id` int NOT NULL,
  `department_id` int NOT NULL,
  `department_head_user_id` int DEFAULT NULL,
  `employee_id` int NOT NULL,
  `project_manager_user_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_employee_appraisal_cycle_employee` (`cycle_id`,`employee_id`),
  KEY `FKi86gbj5wdfhy4gh22c2ie1s5i` (`department_id`),
  KEY `FK77lt4ayo3lio3v4ijcq8laa6e` (`department_head_user_id`),
  KEY `FK6292c3f09dxdg0gcygu8835wk` (`employee_id`),
  KEY `FKi94stmmulbyip4wws9tbr4sh2` (`project_manager_user_id`),
  CONSTRAINT `FK6292c3f09dxdg0gcygu8835wk` FOREIGN KEY (`employee_id`) REFERENCES `employee` (`id`),
  CONSTRAINT `FK77lt4ayo3lio3v4ijcq8laa6e` FOREIGN KEY (`department_head_user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `FKi86gbj5wdfhy4gh22c2ie1s5i` FOREIGN KEY (`department_id`) REFERENCES `department` (`id`),
  CONSTRAINT `FKi94stmmulbyip4wws9tbr4sh2` FOREIGN KEY (`project_manager_user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `FKn9iodfekfaifi8l99lf8ab6t` FOREIGN KEY (`cycle_id`) REFERENCES `appraisal_cycle` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employee_appraisal_form`
--

LOCK TABLES `employee_appraisal_form` WRITE;
/*!40000 ALTER TABLE `employee_appraisal_form` DISABLE KEYS */;
/*!40000 ALTER TABLE `employee_appraisal_form` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employee_appraisal_history`
--

DROP TABLE IF EXISTS `employee_appraisal_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_appraisal_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `action_name` varchar(80) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `from_status` enum('PM_DRAFT','DEPT_HEAD_PENDING','HR_PENDING','COMPLETED','RETURNED','REJECTED') DEFAULT NULL,
  `note` text,
  `to_status` enum('PM_DRAFT','DEPT_HEAD_PENDING','HR_PENDING','COMPLETED','RETURNED','REJECTED') DEFAULT NULL,
  `action_by_user_id` int DEFAULT NULL,
  `employee_appraisal_form_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKe2tgns9kns29f7w2edgpf3d9o` (`action_by_user_id`),
  KEY `FKdc2bodtmv38r94qdhwpdwoc18` (`employee_appraisal_form_id`),
  CONSTRAINT `FKdc2bodtmv38r94qdhwpdwoc18` FOREIGN KEY (`employee_appraisal_form_id`) REFERENCES `employee_appraisal_form` (`id`),
  CONSTRAINT `FKe2tgns9kns29f7w2edgpf3d9o` FOREIGN KEY (`action_by_user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employee_appraisal_history`
--

LOCK TABLES `employee_appraisal_history` WRITE;
/*!40000 ALTER TABLE `employee_appraisal_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `employee_appraisal_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employee_assessment_answers`
--

DROP TABLE IF EXISTS `employee_assessment_answers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_assessment_answers` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `comment` text,
  `item_order` int NOT NULL,
  `max_rating` int NOT NULL,
  `question_id` int DEFAULT NULL,
  `question_text` text NOT NULL,
  `rating` int DEFAULT NULL,
  `is_required` bit(1) NOT NULL,
  `response_type` varchar(30) NOT NULL,
  `section_title` varchar(255) NOT NULL,
  `weight` double NOT NULL,
  `yes_no_answer` bit(1) DEFAULT NULL,
  `assessment_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKshp9yi3wfvb562nyvp3jmx9t2` (`assessment_id`),
  CONSTRAINT `FKshp9yi3wfvb562nyvp3jmx9t2` FOREIGN KEY (`assessment_id`) REFERENCES `employee_assessments` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employee_assessment_answers`
--

LOCK TABLES `employee_assessment_answers` WRITE;
/*!40000 ALTER TABLE `employee_assessment_answers` DISABLE KEYS */;
/*!40000 ALTER TABLE `employee_assessment_answers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employee_assessments`
--

DROP TABLE IF EXISTS `employee_assessments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_assessments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `approved_at` datetime(6) DEFAULT NULL,
  `assessment_date` date DEFAULT NULL,
  `assessment_form_id` int DEFAULT NULL,
  `company_name` varchar(255) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `current_position` varchar(255) DEFAULT NULL,
  `decline_reason` text,
  `declined_at` datetime(6) DEFAULT NULL,
  `department_head_comment` text,
  `department_head_name` varchar(255) DEFAULT NULL,
  `department_head_signature_id` bigint DEFAULT NULL,
  `department_head_signature_image_data` longtext,
  `department_head_signature_image_type` varchar(50) DEFAULT NULL,
  `department_head_signature_name` varchar(255) DEFAULT NULL,
  `department_head_signed_at` datetime(6) DEFAULT NULL,
  `department_head_user_id` int DEFAULT NULL,
  `department_id` int DEFAULT NULL,
  `department_name` varchar(255) DEFAULT NULL,
  `employee_code` varchar(255) DEFAULT NULL,
  `employee_id` int DEFAULT NULL,
  `employee_name` varchar(255) NOT NULL,
  `employee_signature_id` bigint DEFAULT NULL,
  `employee_signature_image_data` longtext,
  `employee_signature_image_type` varchar(50) DEFAULT NULL,
  `employee_signature_name` varchar(255) DEFAULT NULL,
  `employee_signed_at` datetime(6) DEFAULT NULL,
  `form_name` varchar(255) DEFAULT NULL,
  `hr_comment` text,
  `hr_signature_id` bigint DEFAULT NULL,
  `hr_signature_image_data` longtext,
  `hr_signature_image_type` varchar(50) DEFAULT NULL,
  `hr_signature_name` varchar(255) DEFAULT NULL,
  `hr_signed_at` datetime(6) DEFAULT NULL,
  `manager_comment` text,
  `manager_name` varchar(255) DEFAULT NULL,
  `manager_signature_id` bigint DEFAULT NULL,
  `manager_signature_image_data` longtext,
  `manager_signature_image_type` varchar(50) DEFAULT NULL,
  `manager_signature_name` varchar(255) DEFAULT NULL,
  `manager_signed_at` datetime(6) DEFAULT NULL,
  `manager_user_id` int DEFAULT NULL,
  `max_score` double DEFAULT NULL,
  `performance_label` varchar(255) DEFAULT NULL,
  `period_label` varchar(255) NOT NULL,
  `remarks` text,
  `score_percent` double DEFAULT NULL,
  `status` enum('DRAFT','SUBMITTED','REJECTED','PENDING_MANAGER','PENDING_DEPARTMENT_HEAD','PENDING_HR','APPROVED','DECLINED') NOT NULL,
  `submitted_at` datetime(6) DEFAULT NULL,
  `total_score` double DEFAULT NULL,
  `updated_at` datetime(6) NOT NULL,
  `user_id` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employee_assessments`
--

LOCK TABLES `employee_assessments` WRITE;
/*!40000 ALTER TABLE `employee_assessments` DISABLE KEYS */;
/*!40000 ALTER TABLE `employee_assessments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employee_audit_history`
--

DROP TABLE IF EXISTS `employee_audit_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_audit_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `edited_at` datetime(6) NOT NULL,
  `edited_by` int DEFAULT NULL,
  `employee_id` int NOT NULL,
  `field_name` varchar(100) NOT NULL,
  `new_value` varchar(500) DEFAULT NULL,
  `old_value` varchar(500) DEFAULT NULL,
  `reason` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employee_audit_history`
--

LOCK TABLES `employee_audit_history` WRITE;
/*!40000 ALTER TABLE `employee_audit_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `employee_audit_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employee_department`
--

DROP TABLE IF EXISTS `employee_department`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_department` (
  `id` int NOT NULL AUTO_INCREMENT,
  `assign_by` varchar(255) DEFAULT NULL,
  `enddate` date DEFAULT NULL,
  `startdate` date DEFAULT NULL,
  `currentdepartment` int DEFAULT NULL,
  `employee_id` int NOT NULL,
  `parentdepartment` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FKmc1pr3fh1bxau5stjmx4rpjgw` (`currentdepartment`),
  KEY `FK6njtipgqouu9ax631vmw9xlra` (`employee_id`),
  KEY `FKf8190iecicmi04nixqkvbcw4r` (`parentdepartment`),
  CONSTRAINT `FK6njtipgqouu9ax631vmw9xlra` FOREIGN KEY (`employee_id`) REFERENCES `employee` (`id`),
  CONSTRAINT `FKf8190iecicmi04nixqkvbcw4r` FOREIGN KEY (`parentdepartment`) REFERENCES `department` (`id`),
  CONSTRAINT `FKmc1pr3fh1bxau5stjmx4rpjgw` FOREIGN KEY (`currentdepartment`) REFERENCES `department` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employee_department`
--

LOCK TABLES `employee_department` WRITE;
/*!40000 ALTER TABLE `employee_department` DISABLE KEYS */;
INSERT INTO `employee_department` VALUES (15,'seed-data',NULL,'2026-01-01',1,15,1),(16,'seed-data',NULL,'2026-01-01',7,16,7),(17,'seed-data',NULL,'2026-01-01',3,17,3),(18,'seed-data',NULL,'2026-01-01',4,18,4),(19,'seed-data',NULL,'2026-01-01',4,19,4),(20,'seed-data',NULL,'2026-01-01',4,20,4),(21,'seed-data',NULL,'2026-01-01',4,21,4),(22,'seed-data',NULL,'2026-01-01',4,22,4),(23,'seed-data',NULL,'2026-01-01',7,23,7),(24,'seed-data',NULL,'2026-01-01',6,24,6),(25,'seed-data',NULL,'2026-01-01',7,25,7),(26,'seed-data',NULL,'2026-01-01',6,26,6),(27,'seed-data',NULL,'2026-01-01',6,27,6),(28,'seed-data',NULL,'2026-01-01',6,28,6);
/*!40000 ALTER TABLE `employee_department` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employee_kpi_forms`
--

DROP TABLE IF EXISTS `employee_kpi_forms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_kpi_forms` (
  `id` int NOT NULL AUTO_INCREMENT,
  `acknowledged_at` datetime(6) DEFAULT NULL,
  `assigned_at` datetime(6) NOT NULL,
  `finalized_at` datetime(6) DEFAULT NULL,
  `sent_at` datetime(6) DEFAULT NULL,
  `status` enum('ASSIGNED','IN_PROGRESS','FINALIZED','SENT_TO_EMPLOYEE','ACKNOWLEDGED') NOT NULL,
  `total_score` double DEFAULT NULL,
  `total_weighted_score` double DEFAULT NULL,
  `employee_id` int NOT NULL,
  `kpi_form_id` int NOT NULL,
  `early_finalized_reason` text,
  `finalized_before_end_date` bit(1) DEFAULT NULL,
  `finalized_by_user_id` int DEFAULT NULL,
  `kpi_template_cycle_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FKglyrpfyy6wkkqwn2o8500pe14` (`employee_id`),
  KEY `FK2vy170w0p665ds8g697oi1gwj` (`kpi_form_id`),
  KEY `FK5kqrcrniahjfa8a7vlgv5vroa` (`finalized_by_user_id`),
  KEY `FKc2nxy7fgo2il3e8n1672uvwu1` (`kpi_template_cycle_id`),
  CONSTRAINT `FK2vy170w0p665ds8g697oi1gwj` FOREIGN KEY (`kpi_form_id`) REFERENCES `kpi_form` (`id`),
  CONSTRAINT `FK5kqrcrniahjfa8a7vlgv5vroa` FOREIGN KEY (`finalized_by_user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `FKc2nxy7fgo2il3e8n1672uvwu1` FOREIGN KEY (`kpi_template_cycle_id`) REFERENCES `kpi_template_cycle` (`id`),
  CONSTRAINT `FKglyrpfyy6wkkqwn2o8500pe14` FOREIGN KEY (`employee_id`) REFERENCES `employee` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employee_kpi_forms`
--

LOCK TABLES `employee_kpi_forms` WRITE;
/*!40000 ALTER TABLE `employee_kpi_forms` DISABLE KEYS */;
/*!40000 ALTER TABLE `employee_kpi_forms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employee_kpi_scores`
--

DROP TABLE IF EXISTS `employee_kpi_scores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_kpi_scores` (
  `id` int NOT NULL AUTO_INCREMENT,
  `actual_value` double DEFAULT NULL,
  `comment` text,
  `evaluated_at` datetime(6) DEFAULT NULL,
  `evaluated_by_string` varchar(255) DEFAULT NULL,
  `score` double DEFAULT NULL,
  `weighted_score` double DEFAULT NULL,
  `employee_kpi_form_id` int NOT NULL,
  `evaluated_by` int DEFAULT NULL,
  `kpi_form_item_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKhxdad26ggjrb4qw4d7x838yyo` (`employee_kpi_form_id`),
  KEY `FKsbcwf31jn7vxdnkfy9waw9x2x` (`evaluated_by`),
  KEY `FKje1huo6w1wgrivodyg5qfxpac` (`kpi_form_item_id`),
  CONSTRAINT `FKhxdad26ggjrb4qw4d7x838yyo` FOREIGN KEY (`employee_kpi_form_id`) REFERENCES `employee_kpi_forms` (`id`),
  CONSTRAINT `FKje1huo6w1wgrivodyg5qfxpac` FOREIGN KEY (`kpi_form_item_id`) REFERENCES `kpi_form_items` (`id`),
  CONSTRAINT `FKsbcwf31jn7vxdnkfy9waw9x2x` FOREIGN KEY (`evaluated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employee_kpi_scores`
--

LOCK TABLES `employee_kpi_scores` WRITE;
/*!40000 ALTER TABLE `employee_kpi_scores` DISABLE KEYS */;
/*!40000 ALTER TABLE `employee_kpi_scores` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `feedback_assignment_questions`
--

DROP TABLE IF EXISTS `feedback_assignment_questions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `feedback_assignment_questions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `competency_code` varchar(80) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `display_order` int NOT NULL,
  `question_bank_id` bigint DEFAULT NULL,
  `question_code` varchar(80) NOT NULL,
  `question_text_snapshot` text NOT NULL,
  `rating_scale_id` int DEFAULT NULL,
  `is_required` bit(1) NOT NULL,
  `response_type` varchar(40) NOT NULL,
  `scoring_behavior` varchar(30) NOT NULL,
  `section_code` varchar(80) NOT NULL,
  `section_order` int NOT NULL,
  `section_title` varchar(150) NOT NULL,
  `weight` double NOT NULL,
  `assignment_id` bigint NOT NULL,
  `question_version_id` bigint DEFAULT NULL,
  `source_question_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_feedback_assignment_question_code` (`assignment_id`,`question_code`),
  KEY `FKo8b4r2efnytna64ddjwvlmw4m` (`question_version_id`),
  KEY `FKsf4wcljqu0ndth1rf6hmdsyed` (`source_question_id`),
  CONSTRAINT `FK72tc86dpv18qxbd62hbxrjxqh` FOREIGN KEY (`assignment_id`) REFERENCES `feedback_evaluator_assignments` (`id`),
  CONSTRAINT `FKo8b4r2efnytna64ddjwvlmw4m` FOREIGN KEY (`question_version_id`) REFERENCES `feedback_question_versions` (`id`),
  CONSTRAINT `FKsf4wcljqu0ndth1rf6hmdsyed` FOREIGN KEY (`source_question_id`) REFERENCES `feedback_questions` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `feedback_assignment_questions`
--

LOCK TABLES `feedback_assignment_questions` WRITE;
/*!40000 ALTER TABLE `feedback_assignment_questions` DISABLE KEYS */;
/*!40000 ALTER TABLE `feedback_assignment_questions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `feedback_campaigns`
--

DROP TABLE IF EXISTS `feedback_campaigns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `feedback_campaigns` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `auto_submit_completed_drafts_on_close` bit(1) NOT NULL,
  `close_reason` text,
  `closed_at` datetime(6) DEFAULT NULL,
  `closed_by_user_id` bigint DEFAULT NULL,
  `closed_early` bit(1) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `created_by_user_id` bigint NOT NULL,
  `description` text,
  `early_close_request_reason` text,
  `early_close_request_status` enum('NONE','REQUESTED','APPROVED','REJECTED') NOT NULL,
  `early_close_requested_at` datetime(6) DEFAULT NULL,
  `early_close_requested_by_user_id` bigint DEFAULT NULL,
  `early_close_review_reason` text,
  `early_close_reviewed_at` datetime(6) DEFAULT NULL,
  `early_close_reviewed_by_user_id` bigint DEFAULT NULL,
  `end_date` date NOT NULL,
  `end_time` time(6) DEFAULT NULL,
  `form_id` bigint NOT NULL,
  `instructions` text,
  `name` varchar(255) NOT NULL,
  `review_round` enum('ANNUAL','FIRST_HALF','SECOND_HALF','SPECIAL') DEFAULT NULL,
  `review_year` int DEFAULT NULL,
  `start_date` date NOT NULL,
  `start_time` time(6) DEFAULT NULL,
  `status` enum('DRAFT','ACTIVE','CLOSED','CANCELLED') NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `feedback_campaigns`
--

LOCK TABLES `feedback_campaigns` WRITE;
/*!40000 ALTER TABLE `feedback_campaigns` DISABLE KEYS */;
/*!40000 ALTER TABLE `feedback_campaigns` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `feedback_evaluator_assignments`
--

DROP TABLE IF EXISTS `feedback_evaluator_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `feedback_evaluator_assignments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `evaluator_employee_id` bigint NOT NULL,
  `is_anonymous` bit(1) NOT NULL,
  `source_type` enum('MANAGER','PEER','SUBORDINATE','SELF','PROJECT_STAKEHOLDER') NOT NULL,
  `selection_method` enum('AUTO_RANDOM','AUTO_RELATIONSHIP','MANUAL') NOT NULL,
  `status` enum('PENDING','IN_PROGRESS','SUBMITTED','DECLINED','CANCELLED') NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `feedback_request_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKsoa3uho3n4wl0dboccomtx1qh` (`feedback_request_id`,`evaluator_employee_id`),
  CONSTRAINT `FK7t9vf8klj7rl2v947p7odwgx0` FOREIGN KEY (`feedback_request_id`) REFERENCES `feedback_requests` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `feedback_evaluator_assignments`
--

LOCK TABLES `feedback_evaluator_assignments` WRITE;
/*!40000 ALTER TABLE `feedback_evaluator_assignments` DISABLE KEYS */;
/*!40000 ALTER TABLE `feedback_evaluator_assignments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `feedback_forms`
--

DROP TABLE IF EXISTS `feedback_forms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `feedback_forms` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `anonymous_allowed` bit(1) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `created_by_user_id` bigint NOT NULL,
  `form_name` varchar(255) NOT NULL,
  `root_form_id` bigint DEFAULT NULL,
  `status` enum('DRAFT','ACTIVE','ARCHIVED') NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `version_number` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `feedback_forms`
--

LOCK TABLES `feedback_forms` WRITE;
/*!40000 ALTER TABLE `feedback_forms` DISABLE KEYS */;
/*!40000 ALTER TABLE `feedback_forms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `feedback_question_applicability_rules`
--

DROP TABLE IF EXISTS `feedback_question_applicability_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `feedback_question_applicability_rules` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `active` bit(1) NOT NULL,
  `condition_json` json DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `display_order` int NOT NULL,
  `evaluator_relationship_type` varchar(40) NOT NULL,
  `required_override` bit(1) DEFAULT NULL,
  `rule_priority` int NOT NULL,
  `section_code` varchar(80) NOT NULL,
  `section_order` int NOT NULL,
  `section_title` varchar(150) NOT NULL,
  `target_department_id` bigint DEFAULT NULL,
  `target_level_max_rank` int NOT NULL,
  `target_level_min_rank` int NOT NULL,
  `target_position_id` bigint DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `valid_from` date DEFAULT NULL,
  `valid_to` date DEFAULT NULL,
  `weight_override` double DEFAULT NULL,
  `question_version_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKcma1od9mtk37b2sxxhpt4wjfw` (`question_version_id`),
  CONSTRAINT `FKcma1od9mtk37b2sxxhpt4wjfw` FOREIGN KEY (`question_version_id`) REFERENCES `feedback_question_versions` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `feedback_question_applicability_rules`
--

LOCK TABLES `feedback_question_applicability_rules` WRITE;
/*!40000 ALTER TABLE `feedback_question_applicability_rules` DISABLE KEYS */;
/*!40000 ALTER TABLE `feedback_question_applicability_rules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `feedback_question_bank`
--

DROP TABLE IF EXISTS `feedback_question_bank`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `feedback_question_bank` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `competency_code` varchar(80) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `created_by_user_id` bigint NOT NULL,
  `default_rating_scale_id` int DEFAULT NULL,
  `default_required` bit(1) NOT NULL,
  `default_response_type` varchar(40) NOT NULL,
  `default_scoring_behavior` varchar(30) NOT NULL,
  `default_text` text NOT NULL,
  `default_weight` double NOT NULL,
  `question_code` varchar(80) NOT NULL,
  `status` varchar(30) NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_feedback_question_bank_code` (`question_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `feedback_question_bank`
--

LOCK TABLES `feedback_question_bank` WRITE;
/*!40000 ALTER TABLE `feedback_question_bank` DISABLE KEYS */;
/*!40000 ALTER TABLE `feedback_question_bank` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `feedback_question_versions`
--

DROP TABLE IF EXISTS `feedback_question_versions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `feedback_question_versions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `is_active` bit(1) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `help_text` text,
  `question_text` text NOT NULL,
  `rating_scale_id` int DEFAULT NULL,
  `response_type` varchar(40) NOT NULL,
  `scoring_behavior` varchar(30) NOT NULL,
  `version_number` int NOT NULL,
  `question_bank_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_feedback_question_version` (`question_bank_id`,`version_number`),
  CONSTRAINT `FKjh8252s176o5bepp54dmor7ar` FOREIGN KEY (`question_bank_id`) REFERENCES `feedback_question_bank` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `feedback_question_versions`
--

LOCK TABLES `feedback_question_versions` WRITE;
/*!40000 ALTER TABLE `feedback_question_versions` DISABLE KEYS */;
/*!40000 ALTER TABLE `feedback_question_versions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `feedback_questions`
--

DROP TABLE IF EXISTS `feedback_questions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `feedback_questions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `is_required` bit(1) NOT NULL,
  `question_order` int NOT NULL,
  `question_text` text NOT NULL,
  `rating_scale_id` int DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `weight` double DEFAULT NULL,
  `section_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKeh5yj0ueoa331ia160if5wb2v` (`section_id`,`question_order`),
  CONSTRAINT `FKmgoeyg85jke0gplkiwjde8vpx` FOREIGN KEY (`section_id`) REFERENCES `feedback_sections` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `feedback_questions`
--

LOCK TABLES `feedback_questions` WRITE;
/*!40000 ALTER TABLE `feedback_questions` DISABLE KEYS */;
/*!40000 ALTER TABLE `feedback_questions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `feedback_requests`
--

DROP TABLE IF EXISTS `feedback_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `feedback_requests` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `due_at` datetime(6) DEFAULT NULL,
  `is_anonymous_enabled` bit(1) NOT NULL,
  `requested_by_user_id` bigint NOT NULL,
  `status` enum('PENDING','IN_PROGRESS','COMPLETED','CANCELLED') NOT NULL,
  `target_employee_id` bigint NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `campaign_id` bigint NOT NULL,
  `form_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKbd80owy8qh71hsm24k0dpoi54` (`campaign_id`,`target_employee_id`),
  KEY `FKbhbu6gwglqpy80xvbx5nlyv3w` (`form_id`),
  CONSTRAINT `FKbhbu6gwglqpy80xvbx5nlyv3w` FOREIGN KEY (`form_id`) REFERENCES `feedback_forms` (`id`),
  CONSTRAINT `FKj0dh7m9yhsshdeitupurqn5uu` FOREIGN KEY (`campaign_id`) REFERENCES `feedback_campaigns` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `feedback_requests`
--

LOCK TABLES `feedback_requests` WRITE;
/*!40000 ALTER TABLE `feedback_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `feedback_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `feedback_response_items`
--

DROP TABLE IF EXISTS `feedback_response_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `feedback_response_items` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `comment` text,
  `created_at` datetime(6) NOT NULL,
  `rating_value` double DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `assignment_question_id` bigint DEFAULT NULL,
  `question_id` bigint DEFAULT NULL,
  `response_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKbl40b4vyfp9s0hwf5k4smvgg1` (`response_id`,`question_id`),
  UNIQUE KEY `uk_feedback_response_assignment_question` (`response_id`,`assignment_question_id`),
  KEY `FK4b3j9ivs6gsopxww2y58vp9ha` (`assignment_question_id`),
  KEY `FK85bcs0630p90djooeywqbsq5u` (`question_id`),
  CONSTRAINT `FK4b3j9ivs6gsopxww2y58vp9ha` FOREIGN KEY (`assignment_question_id`) REFERENCES `feedback_assignment_questions` (`id`),
  CONSTRAINT `FK6bmxosocoxdaf1556cqpk6fo8` FOREIGN KEY (`response_id`) REFERENCES `feedback_responses` (`id`),
  CONSTRAINT `FK85bcs0630p90djooeywqbsq5u` FOREIGN KEY (`question_id`) REFERENCES `feedback_questions` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `feedback_response_items`
--

LOCK TABLES `feedback_response_items` WRITE;
/*!40000 ALTER TABLE `feedback_response_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `feedback_response_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `feedback_responses`
--

DROP TABLE IF EXISTS `feedback_responses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `feedback_responses` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `comments` text,
  `created_at` datetime(6) NOT NULL,
  `final_status` enum('DRAFT','SUBMITTED','APPROVED') NOT NULL,
  `overall_score` double DEFAULT NULL,
  `submitted_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `evaluator_assignment_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKhoedo9ns6nmccpoe34eokoqp9` (`evaluator_assignment_id`),
  CONSTRAINT `FKrg9p4jq8phsl2pta77jvytaoj` FOREIGN KEY (`evaluator_assignment_id`) REFERENCES `feedback_evaluator_assignments` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `feedback_responses`
--

LOCK TABLES `feedback_responses` WRITE;
/*!40000 ALTER TABLE `feedback_responses` DISABLE KEYS */;
/*!40000 ALTER TABLE `feedback_responses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `feedback_sections`
--

DROP TABLE IF EXISTS `feedback_sections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `feedback_sections` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `order_no` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `form_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKl8mb8xmk1ymfh030021bucahe` (`form_id`,`order_no`),
  CONSTRAINT `FKyxvavwlb4gnkdqq2b18km8kl` FOREIGN KEY (`form_id`) REFERENCES `feedback_forms` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `feedback_sections`
--

LOCK TABLES `feedback_sections` WRITE;
/*!40000 ALTER TABLE `feedback_sections` DISABLE KEYS */;
/*!40000 ALTER TABLE `feedback_sections` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `feedback_summary`
--

DROP TABLE IF EXISTS `feedback_summary`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `feedback_summary` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `assigned_evaluator_count` bigint NOT NULL,
  `average_score` double DEFAULT NULL,
  `completion_rate` double NOT NULL,
  `confidence_level` varchar(32) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `insufficient_feedback` bit(1) NOT NULL,
  `manager_average_score` double DEFAULT NULL,
  `manager_responses` bigint NOT NULL,
  `peer_average_score` double DEFAULT NULL,
  `peer_responses` bigint NOT NULL,
  `pending_evaluator_count` bigint NOT NULL,
  `project_stakeholder_average_score` double DEFAULT NULL,
  `project_stakeholder_responses` bigint NOT NULL,
  `publish_note` text,
  `published_at` datetime(6) DEFAULT NULL,
  `published_by_user_id` bigint DEFAULT NULL,
  `raw_average_score` double DEFAULT NULL,
  `score_calculation_method` varchar(64) NOT NULL,
  `score_calculation_note` varchar(500) DEFAULT NULL,
  `self_average_score` double DEFAULT NULL,
  `self_responses` bigint NOT NULL,
  `submitted_evaluator_count` bigint NOT NULL,
  `subordinate_average_score` double DEFAULT NULL,
  `subordinate_responses` bigint NOT NULL,
  `summarized_at` datetime(6) NOT NULL,
  `target_employee_id` bigint NOT NULL,
  `total_responses` bigint NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `visibility_status` enum('HIDDEN','READY_TO_PUBLISH','PUBLISHED') NOT NULL,
  `campaign_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK6yr9jmk1h2cycwmq6jntqtjw1` (`campaign_id`,`target_employee_id`),
  CONSTRAINT `FK3c43fckob3rnhriuf3jqyoqfa` FOREIGN KEY (`campaign_id`) REFERENCES `feedback_campaigns` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `feedback_summary`
--

LOCK TABLES `feedback_summary` WRITE;
/*!40000 ALTER TABLE `feedback_summary` DISABLE KEYS */;
/*!40000 ALTER TABLE `feedback_summary` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `form_questions`
--

DROP TABLE IF EXISTS `form_questions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `form_questions` (
  `question_id` bigint NOT NULL AUTO_INCREMENT,
  `is_required` bit(1) DEFAULT NULL,
  `question_text` varchar(255) DEFAULT NULL,
  `response_type` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`question_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `form_questions`
--

LOCK TABLES `form_questions` WRITE;
/*!40000 ALTER TABLE `form_questions` DISABLE KEYS */;
/*!40000 ALTER TABLE `form_questions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kpi_category`
--

DROP TABLE IF EXISTS `kpi_category`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kpi_category` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kpi_category`
--

LOCK TABLES `kpi_category` WRITE;
/*!40000 ALTER TABLE `kpi_category` DISABLE KEYS */;
INSERT INTO `kpi_category` VALUES (1,'Delivery Performance'),(2,'Financial Management'),(3,'Quality Assurance'),(4,'Stakeholder Satisfaction'),(5,'Team Performance'),(6,'Compliance Management'),(7,'Budget Management'),(8,'Problem Solving'),(9,'Code Quality'),(10,'System Design'),(11,'Leadership'),(12,'Sales Performance'),(13,'Growth'),(14,'Account Management'),(15,'Productivity'),(16,'Reporting'),(17,'Accuracy'),(18,'Cash Flow'),(19,'New tools/process adoption');
/*!40000 ALTER TABLE `kpi_category` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kpi_form`
--

DROP TABLE IF EXISTS `kpi_form`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kpi_form` (
  `id` int NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `created_by_string` varchar(255) DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `finalized_at` datetime(6) DEFAULT NULL,
  `sent_at` datetime(6) DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `status` enum('DRAFT','ACTIVE','FINALIZED','SENT','ARCHIVED') NOT NULL,
  `title` varchar(255) NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `version` int NOT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FKpk8dcdijh69iyl5vf8tpyyam6` (`created_by`),
  KEY `FKnhfk4jt2h56odhrc99jvpq9g5` (`updated_by`),
  CONSTRAINT `FKnhfk4jt2h56odhrc99jvpq9g5` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`),
  CONSTRAINT `FKpk8dcdijh69iyl5vf8tpyyam6` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kpi_form`
--

LOCK TABLES `kpi_form` WRITE;
/*!40000 ALTER TABLE `kpi_form` DISABLE KEYS */;
/*!40000 ALTER TABLE `kpi_form` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kpi_form_items`
--

DROP TABLE IF EXISTS `kpi_form_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kpi_form_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `description` text,
  `kpi_label` varchar(500) DEFAULT NULL,
  `sort_order` int DEFAULT NULL,
  `target` double NOT NULL,
  `weight` int NOT NULL,
  `kpi_category_id` int NOT NULL,
  `kpi_form_id` int NOT NULL,
  `kpi_item_id` int DEFAULT NULL,
  `kpi_unit_id` int NOT NULL,
  `kpi_unit_label` varchar(100) DEFAULT NULL,
  `kpi_category_label` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK7iscfv9gr2d1huegw22jtsvnu` (`kpi_category_id`),
  KEY `FKpvy2dvvtmn6kih6mlvmmf3dsb` (`kpi_form_id`),
  KEY `FKsrmemil0pyp25kiy65oi12dd6` (`kpi_item_id`),
  KEY `FKkdl7fa5m9c6iosyc7xf31kmfv` (`kpi_unit_id`),
  CONSTRAINT `FK7iscfv9gr2d1huegw22jtsvnu` FOREIGN KEY (`kpi_category_id`) REFERENCES `kpi_category` (`id`),
  CONSTRAINT `FKkdl7fa5m9c6iosyc7xf31kmfv` FOREIGN KEY (`kpi_unit_id`) REFERENCES `kpi_unit` (`id`),
  CONSTRAINT `FKpvy2dvvtmn6kih6mlvmmf3dsb` FOREIGN KEY (`kpi_form_id`) REFERENCES `kpi_form` (`id`),
  CONSTRAINT `FKsrmemil0pyp25kiy65oi12dd6` FOREIGN KEY (`kpi_item_id`) REFERENCES `kpi_items` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kpi_form_items`
--

LOCK TABLES `kpi_form_items` WRITE;
/*!40000 ALTER TABLE `kpi_form_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `kpi_form_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kpi_histories`
--

DROP TABLE IF EXISTS `kpi_histories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kpi_histories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `actual_value` double DEFAULT NULL,
  `changed_at` datetime(6) DEFAULT NULL,
  `changed_by` varchar(255) DEFAULT NULL,
  `cycle_id` int DEFAULT NULL,
  `department_id` int DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `employee_id` int DEFAULT NULL,
  `end_date` datetime(6) DEFAULT NULL,
  `kpi_id` int DEFAULT NULL,
  `measurement_type` varchar(255) DEFAULT NULL,
  `start_date` datetime(6) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `target_value` double DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `unit` varchar(255) DEFAULT NULL,
  `weight` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kpi_histories`
--

LOCK TABLES `kpi_histories` WRITE;
/*!40000 ALTER TABLE `kpi_histories` DISABLE KEYS */;
/*!40000 ALTER TABLE `kpi_histories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kpi_items`
--

DROP TABLE IF EXISTS `kpi_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kpi_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `kpi_name` varchar(255) NOT NULL,
  `kpi_category_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKl1tnimq7fxsxkujaqhdu3eqfy` (`kpi_category_id`),
  CONSTRAINT `FKl1tnimq7fxsxkujaqhdu3eqfy` FOREIGN KEY (`kpi_category_id`) REFERENCES `kpi_category` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kpi_items`
--

LOCK TABLES `kpi_items` WRITE;
/*!40000 ALTER TABLE `kpi_items` DISABLE KEYS */;
INSERT INTO `kpi_items` VALUES (1,'On-time delivery rate',1),(2,'Project margin',2),(3,'Defect leakage',3),(4,'Compliance Rate',4),(5,'Escalation resolution time',4),(6,'Employee turnover rate',5),(7,'Compliance Rate',6),(8,'On-time project delivery',1),(9,'Milestone adherence',1),(10,'Budget variance',7),(11,'Client satisfaction',4),(12,'Employee turnover rate',5),(13,'Innovation & Growth',19),(14,'Compliance Rate',6);
/*!40000 ALTER TABLE `kpi_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kpi_positions`
--

DROP TABLE IF EXISTS `kpi_positions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kpi_positions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `assigned_at` datetime(6) NOT NULL,
  `assigned_by_string` varchar(255) DEFAULT NULL,
  `removed_at` datetime(6) DEFAULT NULL,
  `status` enum('ACTIVE','INACTIVE','REMOVED') NOT NULL,
  `assigned_by` int DEFAULT NULL,
  `kpi_form_id` int NOT NULL,
  `position_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKdm708ns7odp9hrm20a9lourfu` (`kpi_form_id`,`position_id`),
  UNIQUE KEY `UK82x6nm6ro3k7p1ttuxflwbofq` (`position_id`),
  KEY `FK6r6g1o4rn61skh6s60q3ayk08` (`assigned_by`),
  CONSTRAINT `FK6r6g1o4rn61skh6s60q3ayk08` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`),
  CONSTRAINT `FKd1cuepwurd8dgyeb5qwj7bjt1` FOREIGN KEY (`position_id`) REFERENCES `positions` (`id`),
  CONSTRAINT `FKdfecg72wn7r8m1pw38ri3cgb6` FOREIGN KEY (`kpi_form_id`) REFERENCES `kpi_form` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kpi_positions`
--

LOCK TABLES `kpi_positions` WRITE;
/*!40000 ALTER TABLE `kpi_positions` DISABLE KEYS */;
/*!40000 ALTER TABLE `kpi_positions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kpi_template_cycle`
--

DROP TABLE IF EXISTS `kpi_template_cycle`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kpi_template_cycle` (
  `id` int NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `cycle_name` varchar(255) NOT NULL,
  `duration_months` int NOT NULL,
  `end_date` date NOT NULL,
  `start_date` date NOT NULL,
  `status` enum('DRAFT','ACTIVE','DEACTIVATED') NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FKuqjxpsukc2mjr04l9rmrlfhl` (`created_by`),
  KEY `FK8l5kksqjbx8htwpsgdefx717c` (`updated_by`),
  CONSTRAINT `FK8l5kksqjbx8htwpsgdefx717c` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`),
  CONSTRAINT `FKuqjxpsukc2mjr04l9rmrlfhl` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kpi_template_cycle`
--

LOCK TABLES `kpi_template_cycle` WRITE;
/*!40000 ALTER TABLE `kpi_template_cycle` DISABLE KEYS */;
/*!40000 ALTER TABLE `kpi_template_cycle` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kpi_template_cycle_form`
--

DROP TABLE IF EXISTS `kpi_template_cycle_form`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kpi_template_cycle_form` (
  `id` int NOT NULL AUTO_INCREMENT,
  `cycle_id` int NOT NULL,
  `kpi_form_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_cycle_form` (`cycle_id`,`kpi_form_id`),
  KEY `FKq05vp2d87y8tfpryfjpu4v0m7` (`kpi_form_id`),
  CONSTRAINT `FKew2819f3ylofxir21915dlxwv` FOREIGN KEY (`cycle_id`) REFERENCES `kpi_template_cycle` (`id`),
  CONSTRAINT `FKq05vp2d87y8tfpryfjpu4v0m7` FOREIGN KEY (`kpi_form_id`) REFERENCES `kpi_form` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kpi_template_cycle_form`
--

LOCK TABLES `kpi_template_cycle_form` WRITE;
/*!40000 ALTER TABLE `kpi_template_cycle_form` DISABLE KEYS */;
/*!40000 ALTER TABLE `kpi_template_cycle_form` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kpi_template_version_rows`
--

DROP TABLE IF EXISTS `kpi_template_version_rows`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kpi_template_version_rows` (
  `id` int NOT NULL AUTO_INCREMENT,
  `changed_at` datetime(6) DEFAULT NULL,
  `changed_by_string` varchar(255) DEFAULT NULL,
  `reason` text,
  `row_snapshot` text NOT NULL,
  `row_status` enum('INITIAL','UNCHANGED','ADDED','REMOVED') NOT NULL,
  `version_number` int NOT NULL,
  `changed_by` int DEFAULT NULL,
  `kpi_form_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKhetxon9isqhh2ycxe9um8m8s7` (`changed_by`),
  KEY `FKnia972qvrimaeqkav1bu6g26w` (`kpi_form_id`),
  CONSTRAINT `FKhetxon9isqhh2ycxe9um8m8s7` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`),
  CONSTRAINT `FKnia972qvrimaeqkav1bu6g26w` FOREIGN KEY (`kpi_form_id`) REFERENCES `kpi_form` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kpi_template_version_rows`
--

LOCK TABLES `kpi_template_version_rows` WRITE;
/*!40000 ALTER TABLE `kpi_template_version_rows` DISABLE KEYS */;
/*!40000 ALTER TABLE `kpi_template_version_rows` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kpi_unit`
--

DROP TABLE IF EXISTS `kpi_unit`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kpi_unit` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_o5afp6hfjhccjx1pbypenyxdh` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kpi_unit`
--

LOCK TABLES `kpi_unit` WRITE;
/*!40000 ALTER TABLE `kpi_unit` DISABLE KEYS */;
INSERT INTO `kpi_unit` VALUES (10,'≤ 10%'),(2,'≤ target threshold'),(11,'$10,000'),(8,'Design Led'),(9,'Mentoring sessions'),(7,'Number of bugs'),(3,'Project Costing'),(1,'Project Schedule'),(6,'Total client numbers'),(5,'Turnover rate'),(4,'Within SLA');
/*!40000 ALTER TABLE `kpi_unit` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kpi_version_history`
--

DROP TABLE IF EXISTS `kpi_version_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kpi_version_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `change_type` enum('CREATED','UPDATED','DELETED','RESTORED','WEIGHT_MODIFIED','TARGET_MODIFIED','CATEGORY_CHANGED','STATUS_CHANGED','DATE_CHANGED') DEFAULT NULL,
  `changed_at` datetime(6) NOT NULL,
  `changed_reason` varchar(255) DEFAULT NULL,
  `column_name` varchar(255) NOT NULL,
  `modified_by_string` varchar(255) DEFAULT NULL,
  `new_value` text,
  `old_value` text,
  `version_number` int DEFAULT NULL,
  `kpi_form_id` int NOT NULL,
  `kpi_form_item_id` int DEFAULT NULL,
  `modified_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK798p7d4h7x091p28a1jx59sqf` (`kpi_form_id`),
  KEY `FK299l88vhnv000rxarrsrmjeau` (`kpi_form_item_id`),
  KEY `FKbjk8cq2k7k58otmk55fy4en3n` (`modified_by`),
  CONSTRAINT `FK299l88vhnv000rxarrsrmjeau` FOREIGN KEY (`kpi_form_item_id`) REFERENCES `kpi_form_items` (`id`),
  CONSTRAINT `FK798p7d4h7x091p28a1jx59sqf` FOREIGN KEY (`kpi_form_id`) REFERENCES `kpi_form` (`id`),
  CONSTRAINT `FKbjk8cq2k7k58otmk55fy4en3n` FOREIGN KEY (`modified_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kpi_version_history`
--

LOCK TABLES `kpi_version_history` WRITE;
/*!40000 ALTER TABLE `kpi_version_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `kpi_version_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notification_template_channels`
--

DROP TABLE IF EXISTS `notification_template_channels`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification_template_channels` (
  `notification_template_id` int NOT NULL,
  `channel` varchar(255) NOT NULL,
  PRIMARY KEY (`notification_template_id`,`channel`),
  CONSTRAINT `FK52evye0y2ah4elcfp9ef789ty` FOREIGN KEY (`notification_template_id`) REFERENCES `notification_templates` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notification_template_channels`
--

LOCK TABLES `notification_template_channels` WRITE;
/*!40000 ALTER TABLE `notification_template_channels` DISABLE KEYS */;
/*!40000 ALTER TABLE `notification_template_channels` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notification_template_target_roles`
--

DROP TABLE IF EXISTS `notification_template_target_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification_template_target_roles` (
  `notification_template_id` int NOT NULL,
  `target_role` varchar(255) NOT NULL,
  PRIMARY KEY (`notification_template_id`,`target_role`),
  CONSTRAINT `FKn1ouqc6lr44i5xckbnao77qkd` FOREIGN KEY (`notification_template_id`) REFERENCES `notification_templates` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notification_template_target_roles`
--

LOCK TABLES `notification_template_target_roles` WRITE;
/*!40000 ALTER TABLE `notification_template_target_roles` DISABLE KEYS */;
/*!40000 ALTER TABLE `notification_template_target_roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notification_templates`
--

DROP TABLE IF EXISTS `notification_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification_templates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `body_template` varchar(255) DEFAULT NULL,
  `channel_type` varchar(255) DEFAULT NULL,
  `subject_template` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notification_templates`
--

LOCK TABLES `notification_templates` WRITE;
/*!40000 ALTER TABLE `notification_templates` DISABLE KEYS */;
/*!40000 ALTER TABLE `notification_templates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `is_read` bit(1) DEFAULT NULL,
  `message` varchar(255) DEFAULT NULL,
  `reference_id` int DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `type` varchar(255) DEFAULT NULL,
  `notification_template_id` int DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FKjc59ahnrlwgodc921i07g9k36` (`notification_template_id`),
  KEY `FK9y21adhxn0ayjhfocscqox7bh` (`user_id`),
  CONSTRAINT `FK9y21adhxn0ayjhfocscqox7bh` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `FKjc59ahnrlwgodc921i07g9k36` FOREIGN KEY (`notification_template_id`) REFERENCES `notification_templates` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
INSERT INTO `notifications` VALUES (1,'2026-05-20 14:56:23.818000',_binary '\0','Project Manager gave you continuous feedback.',NULL,'New Continuous Feedback','FEEDBACK',NULL,22),(2,'2026-05-20 19:10:30.867000',_binary '\0','HR User scheduled a one-on-one meeting with you at May 20, 2026, 07:11 PM at ACE 2nd Floor. Notes: 1. First Notes',NULL,'New One-on-One Meeting','MEETING',NULL,21),(3,'2026-05-20 19:10:30.904000',_binary '','You scheduled a one-on-one meeting with Normal Employee at May 20, 2026, 07:11 PM at ACE 2nd Floor. Notes: 1. First Notes',NULL,'One-on-One Meeting Created','MEETING',NULL,17),(4,'2026-05-20 19:10:30.916000',_binary '\0','Reminder: your one-on-one meeting with HR User will start at May 20, 2026, 07:11 PM at ACE 2nd Floor.',NULL,'Meeting Reminder','MEETING',NULL,21),(5,'2026-05-20 19:10:30.925000',_binary '','Reminder: your one-on-one meeting with Normal Employee will start at May 20, 2026, 07:11 PM at ACE 2nd Floor.',NULL,'Meeting Reminder','MEETING',NULL,17),(6,'2026-05-20 19:12:35.110000',_binary '\0','HR User scheduled a one-on-one follow-up meeting with you at May 20, 2026, 07:13 PM at 3. Follow Up location. Notes: 4. FollowUp Goal',NULL,'New One-on-One Follow-Up Meeting','MEETING',NULL,21),(7,'2026-05-20 19:12:35.118000',_binary '','You scheduled a one-on-one follow-up meeting with Normal Employee at May 20, 2026, 07:13 PM at 3. Follow Up location. Notes: 4. FollowUp Goal',NULL,'One-on-One Follow-Up Created','MEETING',NULL,17),(8,'2026-05-20 19:12:35.128000',_binary '\0','Reminder: your one-on-one follow-up meeting with HR User will start at May 20, 2026, 07:13 PM at 3. Follow Up location.',NULL,'Meeting Reminder','MEETING',NULL,21),(9,'2026-05-20 19:12:35.128000',_binary '','Reminder: your one-on-one follow-up meeting with Normal Employee will start at May 20, 2026, 07:13 PM at 3. Follow Up location.',NULL,'Meeting Reminder','MEETING',NULL,17),(10,'2026-05-20 20:16:21.155000',_binary '','Department Head (07-PS HEAD) created a PIP for you at 8:16 PM 20.5.2026. The PIP will begin on 2026-05-20.',NULL,'PIP Created','PIP',NULL,20),(11,'2026-05-20 20:16:21.157000',_binary '','You created a PIP for Team Leader. The PIP will begin on 2026-05-20.',NULL,'PIP Created','PIP',NULL,18);
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `one_on_one_action_items`
--

DROP TABLE IF EXISTS `one_on_one_action_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `one_on_one_action_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `description` varchar(1000) DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `owner` varchar(255) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `meeting_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_oj4f693xbfrh4rg4cma7lyane` (`meeting_id`),
  CONSTRAINT `FK4ydciuamt6tglwi47tk7q3d0g` FOREIGN KEY (`meeting_id`) REFERENCES `one_on_one_meetings` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `one_on_one_action_items`
--

LOCK TABLES `one_on_one_action_items` WRITE;
/*!40000 ALTER TABLE `one_on_one_action_items` DISABLE KEYS */;
INSERT INTO `one_on_one_action_items` VALUES (1,'2026-05-20 19:12:35.008644','2. Ongoing Meeting , Meeting Description / Action Items',NULL,'Normal Employee','RECORDED','2026-05-20 19:12:35.008644',1);
/*!40000 ALTER TABLE `one_on_one_action_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `one_on_one_meetings`
--

DROP TABLE IF EXISTS `one_on_one_meetings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `one_on_one_meetings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `first_meeting_end_date` datetime(6) DEFAULT NULL,
  `follow_up_date` datetime(6) DEFAULT NULL,
  `follow_up_end_date` datetime(6) DEFAULT NULL,
  `follow_up_goal` varchar(1000) DEFAULT NULL,
  `follow_up_location` varchar(500) DEFAULT NULL,
  `follow_up_notes` varchar(1000) DEFAULT NULL,
  `follow_up_reminder_24h_sent` bit(1) DEFAULT NULL,
  `follow_up_status` bit(1) DEFAULT NULL,
  `is_finalized` datetime(6) DEFAULT NULL,
  `location` varchar(500) DEFAULT NULL,
  `notes` varchar(1000) DEFAULT NULL,
  `parent_meeting_id` int DEFAULT NULL,
  `reminder_24h_sent` bit(1) DEFAULT NULL,
  `scheduled_date` datetime(6) DEFAULT NULL,
  `status` bit(1) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `created_by_user_id` int DEFAULT NULL,
  `employee_id` int DEFAULT NULL,
  `manager_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FKl14awlv3reb2rbxev2oumffvt` (`created_by_user_id`),
  KEY `FK61qtduvwoed0co702dlufmlgx` (`employee_id`),
  KEY `FK9ii881kth594rds3dh0twrchg` (`manager_id`),
  CONSTRAINT `FK61qtduvwoed0co702dlufmlgx` FOREIGN KEY (`employee_id`) REFERENCES `employee` (`id`),
  CONSTRAINT `FK9ii881kth594rds3dh0twrchg` FOREIGN KEY (`manager_id`) REFERENCES `employee` (`id`),
  CONSTRAINT `FKl14awlv3reb2rbxev2oumffvt` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `one_on_one_meetings`
--

LOCK TABLES `one_on_one_meetings` WRITE;
/*!40000 ALTER TABLE `one_on_one_meetings` DISABLE KEYS */;
INSERT INTO `one_on_one_meetings` VALUES (1,'2026-05-20 19:10:30.818368','2026-05-20 19:12:35.096571','2026-05-20 19:13:00.000000','2026-05-20 19:14:23.661484','4. FollowUp Goal','3. Follow Up location','Final FollowUp mEETING NOTE',_binary '',_binary '','2026-05-20 19:14:23.661484','ACE 2nd Floor','1. First Notes',NULL,_binary '','2026-05-20 19:11:00.000000',_binary '\0','2026-05-20 19:14:23.661484',17,21,17);
/*!40000 ALTER TABLE `one_on_one_meetings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `password_reset_otps`
--

DROP TABLE IF EXISTS `password_reset_otps`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_reset_otps` (
  `id` int NOT NULL AUTO_INCREMENT,
  `consumed_at` datetime(6) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `email` varchar(255) NOT NULL,
  `expires_at` datetime(6) NOT NULL,
  `failed_attempts` int NOT NULL,
  `otp_hash` varchar(128) NOT NULL,
  `reset_token_hash` varchar(128) DEFAULT NULL,
  `verified_at` datetime(6) DEFAULT NULL,
  `user_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK9c75odu4o05pvbvhn2n9ia0tj` (`user_id`),
  CONSTRAINT `FK9c75odu4o05pvbvhn2n9ia0tj` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_reset_otps`
--

LOCK TABLES `password_reset_otps` WRITE;
/*!40000 ALTER TABLE `password_reset_otps` DISABLE KEYS */;
/*!40000 ALTER TABLE `password_reset_otps` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `permissions`
--

DROP TABLE IF EXISTS `permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `module` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_pnvtwliis6p05pn6i3ndjrqt2` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permissions`
--

LOCK TABLES `permissions` WRITE;
/*!40000 ALTER TABLE `permissions` DISABLE KEYS */;
INSERT INTO `permissions` VALUES (1,'Access Control','MANAGE_ROLE_PERMISSIONS'),(2,'Access Control','MANAGE_USER_ROLES'),(3,'Access Control','MANAGE_POSITION_PERMISSIONS'),(4,'HR','POSITION_CRUD'),(5,'HR','EMPLOYEE_CRUD'),(6,'HR','EMPLOYEE_EXCEL_IMPORT'),(7,'HR','DEPARTMENT_CRUD'),(8,'HR','DEPARTMENT_COMPARISON_VIEW'),(9,'PIP','PIP_VIEW'),(10,'PIP','PIP_CREATE'),(11,'KPI','KPI_VIEW'),(12,'KPI','KPI_INPUT'),(13,'KPI','KPI_CRUD'),(14,'Appraisal','APPRAISAL_VIEW'),(15,'Appraisal','APPRAISAL_INPUT_SCORE'),(16,'Self Assessment','SELF_ASSESSMENT_VIEW'),(17,'Self Assessment','SELF_ASSESSMENT_INPUT'),(18,'Continuous Feedback','CONTINUOUS_FEEDBACK_VIEW'),(19,'Continuous Feedback','CONTINUOUS_FEEDBACK_GIVE'),(20,'Team','TEAM_CREATE'),(21,'Team','TEAM_VIEW'),(22,'1:1 Meeting','ONE_ON_ONE_CREATE');
/*!40000 ALTER TABLE `permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pip_phases`
--

DROP TABLE IF EXISTS `pip_phases`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pip_phases` (
  `id` int NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `end_date` date NOT NULL,
  `phase_goal` varchar(4000) NOT NULL,
  `phase_number` int NOT NULL,
  `reason_note` varchar(4000) DEFAULT NULL,
  `start_date` date NOT NULL,
  `status` varchar(40) NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `updated_by_user_id` int DEFAULT NULL,
  `pip_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK8d0e9w9byvym3nkfmaj4vap1x` (`pip_id`),
  CONSTRAINT `FK8d0e9w9byvym3nkfmaj4vap1x` FOREIGN KEY (`pip_id`) REFERENCES `pips` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pip_phases`
--

LOCK TABLES `pip_phases` WRITE;
/*!40000 ALTER TABLE `pip_phases` DISABLE KEYS */;
INSERT INTO `pip_phases` VALUES (1,'2026-05-20 20:16:21.138986','2026-05-21','1. Learn Basic Skills ( Phase  1 Goal )',1,NULL,'2026-05-20','HASNT_STARTED_YET',NULL,NULL,1),(2,'2026-05-20 20:16:21.138986','2026-05-23','2. Phase 2 Goal is here',2,NULL,'2026-05-22','HASNT_STARTED_YET',NULL,NULL,1);
/*!40000 ALTER TABLE `pip_phases` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pip_updates`
--

DROP TABLE IF EXISTS `pip_updates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pip_updates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `action_type` varchar(80) DEFAULT NULL,
  `comments` varchar(4000) DEFAULT NULL,
  `new_value` varchar(4000) DEFAULT NULL,
  `old_value` varchar(4000) DEFAULT NULL,
  `phase_id` int DEFAULT NULL,
  `pip_id` int NOT NULL,
  `status` varchar(80) DEFAULT NULL,
  `updated_at` datetime(6) NOT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pip_updates`
--

LOCK TABLES `pip_updates` WRITE;
/*!40000 ALTER TABLE `pip_updates` DISABLE KEYS */;
INSERT INTO `pip_updates` VALUES (1,'PIP_CREATED','PIP created','Created',NULL,NULL,1,NULL,'2026-05-20 20:16:21.147934',18);
/*!40000 ALTER TABLE `pip_updates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pips`
--

DROP TABLE IF EXISTS `pips`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pips` (
  `id` int NOT NULL AUTO_INCREMENT,
  `comments` varchar(4000) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `created_by_user_id` int NOT NULL,
  `employee_user_id` int NOT NULL,
  `end_date` date NOT NULL,
  `expected_outcomes` varchar(4000) NOT NULL,
  `finished_at` datetime(6) DEFAULT NULL,
  `finished_by_user_id` int DEFAULT NULL,
  `goal` varchar(4000) NOT NULL,
  `start_date` date NOT NULL,
  `status` bit(1) NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pips`
--

LOCK TABLES `pips` WRITE;
/*!40000 ALTER TABLE `pips` DISABLE KEYS */;
INSERT INTO `pips` VALUES (1,NULL,'2026-05-20 20:16:21.138986',18,20,'2026-05-26','2. Be Better ( Expected Outcomes )',NULL,NULL,'1. PIP Goal for Team Leader Employee','2026-05-20',_binary '',NULL);
/*!40000 ALTER TABLE `pips` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `position_levels`
--

DROP TABLE IF EXISTS `position_levels`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `position_levels` (
  `id` int NOT NULL AUTO_INCREMENT,
  `active` bit(1) DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `level_code` varchar(255) NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_5s5d0boaq5jidwk9m5hnku55g` (`level_code`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `position_levels`
--

LOCK TABLES `position_levels` WRITE;
/*!40000 ALTER TABLE `position_levels` DISABLE KEYS */;
INSERT INTO `position_levels` VALUES (10,_binary '','2026-05-20 14:49:53.000000',NULL,'L01','2026-05-20 14:49:53.000000'),(11,_binary '','2026-05-20 14:49:53.000000',NULL,'L02','2026-05-20 14:49:53.000000'),(12,_binary '','2026-05-20 14:49:53.000000',NULL,'L03','2026-05-20 14:49:53.000000'),(13,_binary '','2026-05-20 14:49:53.000000',NULL,'L04','2026-05-20 14:49:53.000000'),(14,_binary '','2026-05-20 14:49:53.000000',NULL,'L05','2026-05-20 14:49:53.000000'),(15,_binary '','2026-05-20 14:49:53.000000',NULL,'L06','2026-05-20 14:49:53.000000'),(16,_binary '','2026-05-20 14:49:53.000000',NULL,'L07','2026-05-20 14:49:53.000000'),(17,_binary '','2026-05-20 14:49:53.000000',NULL,'L08','2026-05-20 14:49:53.000000'),(18,_binary '','2026-05-20 14:49:53.000000',NULL,'L09','2026-05-20 14:49:53.000000');
/*!40000 ALTER TABLE `position_levels` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `position_permission_audit`
--

DROP TABLE IF EXISTS `position_permission_audit`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `position_permission_audit` (
  `id` int NOT NULL AUTO_INCREMENT,
  `column_name` varchar(100) NOT NULL,
  `edited_at` datetime(6) NOT NULL,
  `edited_by` int NOT NULL,
  `new_value` varchar(5) NOT NULL,
  `old_value` varchar(5) DEFAULT NULL,
  `position_id` int NOT NULL,
  `position_title_snapshot` varchar(150) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `position_permission_audit`
--

LOCK TABLES `position_permission_audit` WRITE;
/*!40000 ALTER TABLE `position_permission_audit` DISABLE KEYS */;
INSERT INTO `position_permission_audit` VALUES (1,'team_history','2026-05-20 22:12:36.067930',16,'1','0',43,'09-PRODUCT HEAD'),(2,'team_view','2026-05-20 22:12:36.067930',16,'0','1',43,'09-PRODUCT HEAD'),(3,'continuous_feedback_view','2026-05-20 22:12:36.067930',16,'0','1',43,'09-PRODUCT HEAD'),(4,'team_assign_as_pm','2026-05-20 22:13:23.497637',16,'0','1',39,'05-GENERAL MANAGER'),(5,'pip_edit','2026-05-20 22:13:23.497637',16,'1','0',39,'05-GENERAL MANAGER'),(6,'pip_view_all','2026-05-20 22:13:23.497637',16,'0','1',39,'05-GENERAL MANAGER'),(7,'kpi_view','2026-05-20 22:13:23.497637',16,'0','1',39,'05-GENERAL MANAGER'),(8,'self_assessment_view','2026-05-20 22:13:23.497637',16,'0','1',39,'05-GENERAL MANAGER'),(9,'continuous_feedback_view','2026-05-20 22:13:23.497637',16,'0','1',39,'05-GENERAL MANAGER'),(10,'appraisal_review','2026-05-20 22:13:34.222350',16,'1','0',39,'05-GENERAL MANAGER'),(11,'feedback_send','2026-05-20 22:16:58.076542',16,'1','0',39,'05-GENERAL MANAGER'),(12,'team_history','2026-05-20 22:42:57.122259',16,'1','0',41,'07-PS HEAD'),(13,'team_view','2026-05-20 22:42:57.122259',16,'0','1',41,'07-PS HEAD'),(14,'continuous_feedback_view','2026-05-20 22:42:57.122259',16,'0','1',41,'07-PS HEAD');
/*!40000 ALTER TABLE `position_permission_audit` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `position_permission_audits`
--

DROP TABLE IF EXISTS `position_permission_audits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `position_permission_audits` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `column_name` varchar(255) DEFAULT NULL,
  `edited_at` datetime(6) DEFAULT NULL,
  `edited_by` int DEFAULT NULL,
  `edited_by_name` varchar(255) DEFAULT NULL,
  `new_value` varchar(255) DEFAULT NULL,
  `old_value` varchar(255) DEFAULT NULL,
  `position_id` int DEFAULT NULL,
  `position_title_snapshot` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `position_permission_audits`
--

LOCK TABLES `position_permission_audits` WRITE;
/*!40000 ALTER TABLE `position_permission_audits` DISABLE KEYS */;
/*!40000 ALTER TABLE `position_permission_audits` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `position_permissions`
--

DROP TABLE IF EXISTS `position_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `position_permissions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `appraisal_approve` bit(1) NOT NULL,
  `appraisal_review` bit(1) NOT NULL,
  `appraisal_score_input` bit(1) NOT NULL,
  `appraisal_sign` bit(1) NOT NULL,
  `appraisal_view` bit(1) NOT NULL,
  `continuous_feedback_give` bit(1) NOT NULL,
  `continuous_feedback_view` bit(1) NOT NULL,
  `department_comparison_view` bit(1) NOT NULL,
  `department_crud` bit(1) NOT NULL,
  `employee_crud` bit(1) NOT NULL,
  `employee_excel_import` bit(1) NOT NULL,
  `feedback_form_create` bit(1) NOT NULL,
  `feedback_send` bit(1) NOT NULL,
  `kpi_create` bit(1) NOT NULL,
  `kpi_edit` bit(1) NOT NULL,
  `kpi_input` bit(1) NOT NULL,
  `kpi_score` bit(1) NOT NULL,
  `kpi_view` bit(1) NOT NULL,
  `one_on_one_create` bit(1) NOT NULL,
  `one_on_one_dept_selection` bit(1) NOT NULL,
  `one_on_one_team_selection` bit(1) NOT NULL,
  `pip_create` bit(1) NOT NULL,
  `pip_edit` bit(1) NOT NULL,
  `pip_view_all` bit(1) NOT NULL,
  `position_crud` bit(1) NOT NULL,
  `self_assessment_input` bit(1) NOT NULL,
  `self_assessment_lock` bit(1) NOT NULL,
  `self_assessment_sign` bit(1) NOT NULL,
  `self_assessment_view` bit(1) NOT NULL,
  `team_assign_as_leader` bit(1) NOT NULL,
  `team_assign_as_member` bit(1) NOT NULL,
  `team_assign_as_pm` bit(1) NOT NULL,
  `team_create` bit(1) NOT NULL,
  `team_edit` bit(1) NOT NULL,
  `team_history` bit(1) NOT NULL,
  `team_view` bit(1) NOT NULL,
  `position_id` int NOT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_j5an1u7ov25976eftwsg9mflg` (`position_id`),
  CONSTRAINT `FKflpalfxe9ytt1wy5gy0fvyinb` FOREIGN KEY (`position_id`) REFERENCES `positions` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=127 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `position_permissions`
--

LOCK TABLES `position_permissions` WRITE;
/*!40000 ALTER TABLE `position_permissions` DISABLE KEYS */;
INSERT INTO `position_permissions` VALUES (64,_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',35,NULL,NULL),(65,_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',36,NULL,NULL),(66,_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',37,NULL,NULL),(67,_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',38,NULL,NULL),(68,_binary '\0',_binary '',_binary '',_binary '',_binary '',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '',_binary '',_binary '\0',_binary '',_binary '\0',_binary '',_binary '',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',39,NULL,NULL),(69,_binary '\0',_binary '\0',_binary '',_binary '',_binary '',_binary '',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '',_binary '',_binary '',_binary '\0',_binary '',_binary '',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',40,NULL,NULL),(70,_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '',_binary '',_binary '\0',_binary '',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '',_binary '\0',41,NULL,NULL),(71,_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '',_binary '',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '',_binary '',_binary '\0',_binary '',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '',42,NULL,NULL),(72,_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '',_binary '',_binary '\0',_binary '',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '',_binary '\0',43,NULL,NULL),(73,_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '',_binary '',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '',_binary '',_binary '\0',_binary '',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '',44,NULL,NULL),(74,_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '',_binary '',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '',_binary '',_binary '\0',_binary '',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '',45,NULL,NULL),(75,_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '',_binary '',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',46,NULL,NULL),(76,_binary '',_binary '',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '',_binary '',_binary '',_binary '',_binary '',_binary '',_binary '\0',_binary '',_binary '',_binary '\0',_binary '',_binary '',_binary '',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '',_binary '',_binary '',_binary '',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',47,NULL,NULL),(77,_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',48,NULL,NULL),(78,_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '',_binary '',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',49,NULL,NULL),(79,_binary '\0',_binary '\0',_binary '',_binary '',_binary '',_binary '',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '',_binary '',_binary '',_binary '\0',_binary '',_binary '',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',50,NULL,NULL),(80,_binary '\0',_binary '\0',_binary '',_binary '',_binary '',_binary '',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '',_binary '',_binary '',_binary '\0',_binary '',_binary '',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',51,NULL,NULL),(81,_binary '\0',_binary '\0',_binary '',_binary '',_binary '',_binary '',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '',_binary '',_binary '',_binary '\0',_binary '',_binary '',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',52,NULL,NULL),(82,_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '',_binary '',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',53,NULL,NULL),(83,_binary '\0',_binary '\0',_binary '',_binary '',_binary '',_binary '',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '',_binary '',_binary '',_binary '\0',_binary '',_binary '',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',54,NULL,NULL),(84,_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '',_binary '',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',55,NULL,NULL),(85,_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '',_binary '',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',56,NULL,NULL),(86,_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '',_binary '',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',57,NULL,NULL),(87,_binary '\0',_binary '\0',_binary '',_binary '',_binary '',_binary '',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '',_binary '',_binary '',_binary '\0',_binary '',_binary '',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',58,NULL,NULL),(88,_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '',_binary '',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',59,NULL,NULL),(89,_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '',_binary '',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',60,NULL,NULL),(90,_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '',_binary '',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',61,NULL,NULL),(91,_binary '',_binary '',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '',_binary '',_binary '',_binary '',_binary '',_binary '',_binary '\0',_binary '',_binary '',_binary '\0',_binary '',_binary '',_binary '',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '',_binary '',_binary '',_binary '',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',62,NULL,NULL),(92,_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',63,NULL,NULL),(93,_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '',_binary '',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',64,NULL,NULL),(94,_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '',_binary '',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',65,NULL,NULL),(95,_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '',_binary '',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',66,NULL,NULL),(96,_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '',_binary '',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',67,NULL,NULL),(97,_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '',_binary '\0',_binary '',_binary '',_binary '\0',_binary '',_binary '\0',_binary '\0',_binary '\0',_binary '\0',_binary '\0',68,NULL,NULL);
/*!40000 ALTER TABLE `position_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `positions`
--

DROP TABLE IF EXISTS `positions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `positions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `created_by` varchar(255) DEFAULT NULL,
  `description` text,
  `position_title` varchar(150) NOT NULL,
  `status` bit(1) NOT NULL,
  `level_id` int NOT NULL,
  `role_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FKr7u7lb83d5c88gtlnttckhmb1` (`level_id`),
  KEY `FKf1as2etuafbbyed7iup1vhy2c` (`role_id`),
  CONSTRAINT `FKf1as2etuafbbyed7iup1vhy2c` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`),
  CONSTRAINT `FKr7u7lb83d5c88gtlnttckhmb1` FOREIGN KEY (`level_id`) REFERENCES `position_levels` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=69 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `positions`
--

LOCK TABLES `positions` WRITE;
/*!40000 ALTER TABLE `positions` DISABLE KEYS */;
INSERT INTO `positions` VALUES (35,'2026-05-20 14:49:53.000000','seed-data','Seeded 01-CHAIRMAN mapped to CEO dashboard role.','CHAIRMAN',_binary '',10,NULL),(36,'2026-05-20 14:49:53.000000','seed-data','Seeded 02-CEO mapped to CEO dashboard role.','CEO',_binary '',11,NULL),(37,'2026-05-20 14:49:53.000000','seed-data','Seeded 03-COO mapped to CEO dashboard role.','COO',_binary '',11,NULL),(38,'2026-05-20 14:49:53.000000','seed-data','Seeded 04-EXECUTIVE DIRECTOR mapped to CEO dashboard role.','EXECUTIVE DIRECTOR',_binary '',12,NULL),(39,'2026-05-20 14:49:53.000000','seed-data','Seeded 05-GENERAL MANAGER mapped to MANAGER dashboard role.','GENERAL MANAGER',_binary '',12,NULL),(40,'2026-05-20 14:49:53.000000','seed-data','Seeded 06-EXTERNAL CONSULTANTS mapped to MANAGER dashboard role.','EXTERNAL CONSULTANTS',_binary '',12,NULL),(41,'2026-05-20 14:49:53.000000','seed-data','Seeded 07-PS HEAD mapped to DEPARTMENTHEAD dashboard role.','PS HEAD',_binary '',13,NULL),(42,'2026-05-20 14:49:53.000000','seed-data','Seeded 08-SALES HEAD mapped to DEPARTMENTHEAD dashboard role.','SALES HEAD',_binary '',13,NULL),(43,'2026-05-20 14:49:53.000000','seed-data','Seeded 09-PRODUCT HEAD mapped to DEPARTMENTHEAD dashboard role.','PRODUCT HEAD',_binary '',13,NULL),(44,'2026-05-20 14:49:53.000000','seed-data','Seeded 10-OM HEAD mapped to DEPARTMENTHEAD dashboard role.','OM HEAD',_binary '',13,NULL),(45,'2026-05-20 14:49:53.000000','seed-data','Seeded 11-MARKETING HEAD mapped to DEPARTMENTHEAD dashboard role.','MARKETING HEAD',_binary '',13,NULL),(46,'2026-05-20 14:49:53.000000','seed-data','Seeded 12-SENIOR FINANCE OFFICER mapped to EMPLOYEE dashboard role.','SENIOR FINANCE OFFICER',_binary '',13,NULL),(47,'2026-05-20 14:49:53.000000','seed-data','Seeded 13-SENIOR HR OFFICER mapped to HR dashboard role.','SENIOR HR OFFICER',_binary '',13,NULL),(48,'2026-05-20 14:49:53.000000','seed-data','Seeded 14-SENIOR ADMIN OFFICER mapped to ADMIN dashboard role.','SENIOR ADMIN OFFICER',_binary '',13,NULL),(49,'2026-05-20 14:49:53.000000','seed-data','Seeded 15-CORPORATE LAWYER mapped to EMPLOYEE dashboard role.','CORPORATE LAWYER',_binary '',13,NULL),(50,'2026-05-20 14:49:53.000000','seed-data','Seeded 16-ACCOUNT MANAGER mapped to MANAGER dashboard role.','ACCOUNT MANAGER',_binary '',14,NULL),(51,'2026-05-20 14:49:53.000000','seed-data','Seeded 17-PROJECT MANAGER mapped to MANAGER dashboard role.','PROJECT MANAGER',_binary '',14,NULL),(52,'2026-05-20 14:49:53.000000','seed-data','Seeded 18. CALL CENTER SUPERVISOR mapped to MANAGER dashboard role.','CALL CENTER SUPERVISOR',_binary '',14,NULL),(53,'2026-05-20 14:49:53.000000','seed-data','Seeded 19-TEAM LEADER mapped to EMPLOYEE dashboard role.','TEAM LEADER',_binary '',15,NULL),(54,'2026-05-20 14:49:53.000000','seed-data','Seeded 20-LEAD DESIGNER mapped to MANAGER dashboard role.','LEAD DESIGNER',_binary '',15,NULL),(55,'2026-05-20 14:49:53.000000','seed-data','Seeded 21-SSE mapped to EMPLOYEE dashboard role.','SSE',_binary '',15,NULL),(56,'2026-05-20 14:49:53.000000','seed-data','Seeded 22-DESIGNER mapped to EMPLOYEE dashboard role.','DESIGNER',_binary '',15,NULL),(57,'2026-05-20 14:49:53.000000','seed-data','Seeded 23-SALES EXECUTIVE mapped to EMPLOYEE dashboard role.','SALES EXECUTIVE',_binary '',15,NULL),(58,'2026-05-20 14:49:53.000000','seed-data','Seeded 24-SALES ADMIN mapped to MANAGER dashboard role.','SALES ADMIN',_binary '',15,NULL),(59,'2026-05-20 14:49:53.000000','seed-data','Seeded 25-TRANSLATOR mapped to EMPLOYEE dashboard role.','TRANSLATOR',_binary '',15,NULL),(60,'2026-05-20 14:49:53.000000','seed-data','Seeded 26-SE mapped to EMPLOYEE dashboard role.','SE',_binary '',16,NULL),(61,'2026-05-20 14:49:53.000000','seed-data','Seeded 27-JUNIOR FINANCE OFFICER mapped to EMPLOYEE dashboard role.','JUNIOR FINANCE OFFICER',_binary '',16,NULL),(62,'2026-05-20 14:49:53.000000','seed-data','Seeded 28-JUNIOR HR OFFICER mapped to HR dashboard role.','JUNIOR HR OFFICER',_binary '',16,NULL),(63,'2026-05-20 14:49:53.000000','seed-data','Seeded 29-JUNIOR ADMIN OFFICER mapped to ADMIN dashboard role.','JUNIOR ADMIN OFFICER',_binary '',16,NULL),(64,'2026-05-20 14:49:53.000000','seed-data','Seeded 30.CALL CENTER OFFICER mapped to EMPLOYEE dashboard role.','CALL CENTER OFFICER',_binary '',16,NULL),(65,'2026-05-20 14:49:53.000000','seed-data','Seeded 31-OJT mapped to EMPLOYEE dashboard role.','OJT',_binary '',17,NULL),(66,'2026-05-20 14:49:53.000000','seed-data','Seeded 32-DRIVERS mapped to EMPLOYEE dashboard role.','DRIVERS',_binary '',18,NULL),(67,'2026-05-20 14:49:53.000000','seed-data','Seeded 33-CLEANERS mapped to EMPLOYEE dashboard role.','CLEANERS',_binary '',18,NULL),(68,'2026-05-20 14:49:53.000000','seed-data','Seeded 34-SECURITY mapped to EMPLOYEE dashboard role.','SECURITY',_binary '',18,NULL);
/*!40000 ALTER TABLE `positions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rating_history`
--

DROP TABLE IF EXISTS `rating_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rating_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `column_name` varchar(50) NOT NULL,
  `edited_at` datetime(6) NOT NULL,
  `edited_by` varchar(100) NOT NULL,
  `new_text` varchar(500) DEFAULT NULL,
  `old_text` varchar(500) DEFAULT NULL,
  `edited_by_id` int DEFAULT NULL,
  `rating_scale_id` int DEFAULT NULL,
  `rating_score_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FKc4c8tcm7c8hehj46otpml4ppb` (`edited_by_id`),
  KEY `FKi9vkjddsysgontolyo660jsa2` (`rating_scale_id`),
  KEY `FKlg5yx11rgneft1v6r1emj4cpv` (`rating_score_id`),
  CONSTRAINT `FKc4c8tcm7c8hehj46otpml4ppb` FOREIGN KEY (`edited_by_id`) REFERENCES `users` (`id`),
  CONSTRAINT `FKi9vkjddsysgontolyo660jsa2` FOREIGN KEY (`rating_scale_id`) REFERENCES `rating_scales` (`id`),
  CONSTRAINT `FKlg5yx11rgneft1v6r1emj4cpv` FOREIGN KEY (`rating_score_id`) REFERENCES `rating_score` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rating_history`
--

LOCK TABLES `rating_history` WRITE;
/*!40000 ALTER TABLE `rating_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `rating_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rating_scales`
--

DROP TABLE IF EXISTS `rating_scales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rating_scales` (
  `id` int NOT NULL AUTO_INCREMENT,
  `description` varchar(50) NOT NULL,
  `performance_level` varchar(50) DEFAULT NULL,
  `promotion_eligibility` varchar(50) DEFAULT NULL,
  `scales` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_rgr046e0eojj3rx7t1fayi5b0` (`scales`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rating_scales`
--

LOCK TABLES `rating_scales` WRITE;
/*!40000 ALTER TABLE `rating_scales` DISABLE KEYS */;
/*!40000 ALTER TABLE `rating_scales` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rating_score`
--

DROP TABLE IF EXISTS `rating_score`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rating_score` (
  `id` int NOT NULL AUTO_INCREMENT,
  `explanation` varchar(200) NOT NULL,
  `score_range` varchar(10) NOT NULL,
  `description_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_guqbumk5051v886gt1qk1nsfs` (`score_range`),
  KEY `FKev1uajv9l7jhk1q2qhbugd3l5` (`description_id`),
  CONSTRAINT `FKev1uajv9l7jhk1q2qhbugd3l5` FOREIGN KEY (`description_id`) REFERENCES `rating_scales` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rating_score`
--

LOCK TABLES `rating_score` WRITE;
/*!40000 ALTER TABLE `rating_score` DISABLE KEYS */;
/*!40000 ALTER TABLE `rating_score` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `refresh_tokens`
--

DROP TABLE IF EXISTS `refresh_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `refresh_tokens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `expiry_date` datetime(6) NOT NULL,
  `token` varchar(255) NOT NULL,
  `user_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_ghpmfn23vmxfu3spu3lfg4r2d` (`token`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `refresh_tokens`
--

LOCK TABLES `refresh_tokens` WRITE;
/*!40000 ALTER TABLE `refresh_tokens` DISABLE KEYS */;
INSERT INTO `refresh_tokens` VALUES (3,'2026-05-27 15:21:02.010000','a3e92f79-328e-4adf-809e-60324d590ab1',22),(8,'2026-05-27 20:17:02.620000','83c84a4f-5288-4902-8c9c-ddc8d7d85bfd',20),(10,'2026-05-27 20:22:10.109000','ee595c57-44d4-45e0-904f-7ea04c1e7dfa',19),(14,'2026-05-27 22:43:17.358000','0bc16a59-213d-4cfe-841d-c5b4a9823895',18),(17,'2026-05-29 11:46:35.221000','d75caee3-638b-4c7c-b6cb-3e7d68507506',16),(22,'2026-05-29 20:32:54.125000','99927b49-f118-4603-b70a-33ac7d3574d4',17);
/*!40000 ALTER TABLE `refresh_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `role_permissions`
--

DROP TABLE IF EXISTS `role_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `permission_id` int DEFAULT NULL,
  `role_id` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=66 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role_permissions`
--

LOCK TABLES `role_permissions` WRITE;
/*!40000 ALTER TABLE `role_permissions` DISABLE KEYS */;
INSERT INTO `role_permissions` VALUES (1,1,8),(2,2,8),(3,3,8),(4,4,8),(5,5,8),(6,6,8),(7,7,8),(8,8,8),(9,9,8),(10,10,8),(11,11,8),(12,12,8),(13,13,8),(14,14,8),(15,15,8),(16,16,8),(17,17,8),(18,18,8),(19,19,8),(20,20,8),(21,21,8),(22,22,8),(23,1,7),(24,2,7),(25,3,7),(26,4,7),(27,5,7),(28,6,7),(29,7,7),(30,8,7),(31,9,7),(32,11,7),(33,13,7),(34,14,7),(35,16,7),(36,17,7),(37,18,7),(38,22,7),(39,20,11),(40,21,11),(41,9,11),(42,10,11),(43,11,11),(44,14,11),(45,16,11),(46,18,11),(47,19,11),(48,22,11),(49,9,12),(50,10,12),(51,11,12),(52,12,12),(53,14,12),(54,15,12),(55,16,12),(56,18,12),(57,19,12),(58,22,12),(59,11,10),(60,16,10),(61,17,10),(62,18,10),(63,11,9),(64,14,9),(65,8,9);
/*!40000 ALTER TABLE `role_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `active` bit(1) DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_ofx66keruapi6vyqpv6f2or37` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (7,_binary '','2026-05-20 14:49:53.000000',NULL,'Human Resources dashboard. Manages employees, departments, KPI/appraisal/feedback setup, position CRUD, and HR reports.','HR','2026-05-20 14:49:53.000000'),(8,_binary '','2026-05-20 14:49:53.000000',NULL,'System administrator. Manages accounts, access control, roles, and position permissions.','ADMIN','2026-05-20 14:49:53.000000'),(9,_binary '','2026-05-20 14:49:53.000000',NULL,'Executive/CEO dashboard. Reserved for executive review features.','CEO','2026-05-20 14:49:53.000000'),(10,_binary '','2026-05-20 14:49:53.000000',NULL,'Employee dashboard. Views own KPIs, appraisals, self-assessments, and received feedback.','EMPLOYEE','2026-05-20 14:49:53.000000'),(11,_binary '','2026-05-20 14:49:53.000000',NULL,'Department Head dashboard. Creates department teams and reviews department employee workflows.','DEPARTMENTHEAD','2026-05-20 14:49:53.000000'),(12,_binary '','2026-05-20 14:49:53.000000',NULL,'Manager dashboard. Inputs KPI/appraisal scores, creates PIP, and gives continuous feedback within department scope.','MANAGER','2026-05-20 14:49:53.000000');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `signatures`
--

DROP TABLE IF EXISTS `signatures`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `signatures` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `image_data` longtext NOT NULL,
  `image_type` varchar(50) NOT NULL,
  `is_active` bit(1) NOT NULL,
  `is_default` bit(1) NOT NULL,
  `name` varchar(120) NOT NULL,
  `role` enum('CEO','HR','DEPARTMENT_HEAD','MANAGER','ADMIN','EMPLOYEE') NOT NULL,
  `source_type` enum('DRAWN','UPLOADED') NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `user_id` bigint NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `signatures`
--

LOCK TABLES `signatures` WRITE;
/*!40000 ALTER TABLE `signatures` DISABLE KEYS */;
/*!40000 ALTER TABLE `signatures` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `team`
--

DROP TABLE IF EXISTS `team`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `team` (
  `id` int NOT NULL AUTO_INCREMENT,
  `created_date` date NOT NULL,
  `status` varchar(20) NOT NULL,
  `team_goal` varchar(500) DEFAULT NULL,
  `team_name` varchar(100) NOT NULL,
  `created_by_id` int NOT NULL,
  `department_id` int NOT NULL,
  `project_manager_id` int DEFAULT NULL,
  `team_leader_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK3yj1v7emjl0k3liuk1hh5x9yo` (`created_by_id`),
  KEY `FKcitsl0ygrf7nbmydhlcqorb3p` (`department_id`),
  KEY `FKk2j63676ol745bgvpye7le7t6` (`project_manager_id`),
  KEY `FK4sibnb6rjpyth97lemggqt2ul` (`team_leader_id`),
  CONSTRAINT `FK3yj1v7emjl0k3liuk1hh5x9yo` FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`),
  CONSTRAINT `FK4sibnb6rjpyth97lemggqt2ul` FOREIGN KEY (`team_leader_id`) REFERENCES `users` (`id`),
  CONSTRAINT `FKcitsl0ygrf7nbmydhlcqorb3p` FOREIGN KEY (`department_id`) REFERENCES `department` (`id`),
  CONSTRAINT `FKk2j63676ol745bgvpye7le7t6` FOREIGN KEY (`project_manager_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `team`
--

LOCK TABLES `team` WRITE;
/*!40000 ALTER TABLE `team` DISABLE KEYS */;
INSERT INTO `team` VALUES (1,'2026-05-20','Active','Build and maintain internal systems.','IT Platform Team',18,4,19,20),(2,'2026-05-20','Active','Grow sales pipeline and customer retention.','Sales Growth Team',16,6,26,27),(3,'2026-02-19','Inactive','Historical inactive team for testing history.','Inactive Operations Team',16,7,26,27);
/*!40000 ALTER TABLE `team` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `team_history`
--

DROP TABLE IF EXISTS `team_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `team_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `action_type` varchar(60) NOT NULL,
  `changed_at` datetime(6) NOT NULL,
  `changed_by_name` varchar(255) DEFAULT NULL,
  `field_name` varchar(100) DEFAULT NULL,
  `new_value` text,
  `old_value` text,
  `reason` text,
  `changed_by_id` int DEFAULT NULL,
  `team_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK4hvr4sshvkob3c6st1nh8n5a5` (`changed_by_id`),
  KEY `FKlk1mymkn0bmgig97x851e60g4` (`team_id`),
  CONSTRAINT `FK4hvr4sshvkob3c6st1nh8n5a5` FOREIGN KEY (`changed_by_id`) REFERENCES `users` (`id`),
  CONSTRAINT `FKlk1mymkn0bmgig97x851e60g4` FOREIGN KEY (`team_id`) REFERENCES `team` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `team_history`
--

LOCK TABLES `team_history` WRITE;
/*!40000 ALTER TABLE `team_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `team_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `team_member`
--

DROP TABLE IF EXISTS `team_member`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `team_member` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ended_date` date DEFAULT NULL,
  `started_date` date NOT NULL,
  `edited_by_id` int DEFAULT NULL,
  `member_user_id` int NOT NULL,
  `team_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_team_member_team_user` (`team_id`,`member_user_id`),
  KEY `FKqjxjdup2qlcfoqi57l2fu9qep` (`edited_by_id`),
  KEY `FKsxx4o7670cev98s9hsboljaap` (`member_user_id`),
  CONSTRAINT `FK9ubp79ei4tv4crd0r9n7u5i6e` FOREIGN KEY (`team_id`) REFERENCES `team` (`id`),
  CONSTRAINT `FKqjxjdup2qlcfoqi57l2fu9qep` FOREIGN KEY (`edited_by_id`) REFERENCES `users` (`id`),
  CONSTRAINT `FKsxx4o7670cev98s9hsboljaap` FOREIGN KEY (`member_user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `team_member`
--

LOCK TABLES `team_member` WRITE;
/*!40000 ALTER TABLE `team_member` DISABLE KEYS */;
INSERT INTO `team_member` VALUES (1,NULL,'2026-05-20',18,21,1),(2,NULL,'2026-05-20',18,22,1),(4,NULL,'2026-05-20',16,24,2),(5,NULL,'2026-05-20',16,28,2),(7,'2026-04-30','2026-02-19',16,25,3);
/*!40000 ALTER TABLE `team_member` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_profiles`
--

DROP TABLE IF EXISTS `user_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_profiles` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `phone_number` varchar(50) DEFAULT NULL,
  `profile_image_data` longtext,
  `profile_image_type` varchar(100) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `user_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_e5h89rk3ijvdmaiig4srogdc6` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_profiles`
--

LOCK TABLES `user_profiles` WRITE;
/*!40000 ALTER TABLE `user_profiles` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_profiles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_roles`
--

DROP TABLE IF EXISTS `user_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `role_id` int DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_roles`
--

LOCK TABLES `user_roles` WRITE;
/*!40000 ALTER TABLE `user_roles` DISABLE KEYS */;
INSERT INTO `user_roles` VALUES (15,9,15),(16,8,16),(17,7,17),(18,11,18),(19,12,19),(20,10,20),(21,10,21),(22,10,22),(23,8,23),(24,10,24),(25,10,25),(26,12,26),(27,10,27),(28,10,28);
/*!40000 ALTER TABLE `user_roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `account_status` varchar(255) DEFAULT NULL,
  `active` bit(1) DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `department_id` int DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `employee_code` varchar(255) DEFAULT NULL,
  `employee_id` int DEFAULT NULL,
  `full_name` varchar(255) DEFAULT NULL,
  `join_date` date DEFAULT NULL,
  `last_temporary_password_sent_at` datetime(6) DEFAULT NULL,
  `manager_id` int DEFAULT NULL,
  `must_change_password` bit(1) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `password_changed_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `position_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_6dotkott2kjsp8vw4d0m25fb7` (`email`),
  KEY `FK6ph6xiiydudp6umjf2xckbbmi` (`position_id`),
  CONSTRAINT `FK6ph6xiiydudp6umjf2xckbbmi` FOREIGN KEY (`position_id`) REFERENCES `positions` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (15,'ACTIVE',_binary '','2026-05-20 14:49:53.000000',1,'ceo@epms.local','CEO001',15,'CEO User','2026-01-01',NULL,NULL,_binary '\0','$2y$10$6q0YhfHefBEkSLI1zYhEyutlcGsVpVyRNY/A80Y4EbqZl97JHnHne','2026-05-20 14:49:53.000000','2026-05-20 14:49:53.000000',36),(16,'ACTIVE',_binary '','2026-05-20 14:49:53.000000',7,'admin@epms.local','ADM001',16,'Admin User','2026-01-01',NULL,NULL,_binary '\0','$2y$10$6q0YhfHefBEkSLI1zYhEyutlcGsVpVyRNY/A80Y4EbqZl97JHnHne','2026-05-20 14:49:53.000000','2026-05-20 14:49:53.000000',48),(17,'ACTIVE',_binary '','2026-05-20 14:49:53.000000',3,'hr@epms.local','HR001',17,'HR User','2026-01-01',NULL,NULL,_binary '\0','$2y$10$6q0YhfHefBEkSLI1zYhEyutlcGsVpVyRNY/A80Y4EbqZl97JHnHne','2026-05-20 14:49:53.000000','2026-05-20 14:49:53.000000',47),(18,'ACTIVE',_binary '','2026-05-20 14:49:53.000000',4,'dh@epms.local','DH001',18,'Department Head','2026-01-01',NULL,NULL,_binary '\0','$2y$10$6q0YhfHefBEkSLI1zYhEyutlcGsVpVyRNY/A80Y4EbqZl97JHnHne','2026-05-20 14:49:53.000000','2026-05-20 14:49:53.000000',41),(19,'ACTIVE',_binary '','2026-05-20 14:49:53.000000',4,'manager@epms.local','MGR001',19,'Project Manager','2026-01-01',NULL,NULL,_binary '\0','$2y$10$6q0YhfHefBEkSLI1zYhEyutlcGsVpVyRNY/A80Y4EbqZl97JHnHne','2026-05-20 14:49:53.000000','2026-05-20 14:49:53.000000',51),(20,'ACTIVE',_binary '','2026-05-20 14:49:53.000000',4,'teamleader@epms.local','TL001',20,'Team Leader','2026-01-01',NULL,19,_binary '\0','$2y$10$6q0YhfHefBEkSLI1zYhEyutlcGsVpVyRNY/A80Y4EbqZl97JHnHne','2026-05-20 14:49:53.000000','2026-05-20 14:49:53.000000',53),(21,'ACTIVE',_binary '','2026-05-20 14:49:53.000000',4,'employee@epms.local','EMP001',21,'Normal Employee','2026-01-01',NULL,19,_binary '\0','$2y$10$6q0YhfHefBEkSLI1zYhEyutlcGsVpVyRNY/A80Y4EbqZl97JHnHne','2026-05-20 14:49:53.000000','2026-05-20 14:49:53.000000',60),(22,'ACTIVE',_binary '','2026-05-20 14:49:53.000000',4,'phyuphyu@gmail.com','EX001',22,'Phyu Phyu','2026-01-01',NULL,19,_binary '\0','$2y$10$6q0YhfHefBEkSLI1zYhEyutlcGsVpVyRNY/A80Y4EbqZl97JHnHne','2026-05-20 14:49:53.000000','2026-05-20 14:49:53.000000',60),(23,'ACTIVE',_binary '','2026-05-20 14:49:53.000000',7,'nini@gmail.com','EX002',23,'Ni Ni','2026-01-01',NULL,NULL,_binary '\0','$2y$10$6q0YhfHefBEkSLI1zYhEyutlcGsVpVyRNY/A80Y4EbqZl97JHnHne','2026-05-20 14:49:53.000000','2026-05-20 14:49:53.000000',63),(24,'ACTIVE',_binary '','2026-05-20 14:49:53.000000',6,'aungaung@gmail.com','EX003',24,'Aung Aung','2026-01-01',NULL,26,_binary '\0','$2y$10$6q0YhfHefBEkSLI1zYhEyutlcGsVpVyRNY/A80Y4EbqZl97JHnHne','2026-05-20 14:49:53.000000','2026-05-20 14:49:53.000000',57),(25,'ACTIVE',_binary '','2026-05-20 14:49:53.000000',7,'koko@gmail.com','EX004',25,'Ko Ko','2026-01-01',NULL,NULL,_binary '\0','$2y$10$6q0YhfHefBEkSLI1zYhEyutlcGsVpVyRNY/A80Y4EbqZl97JHnHne','2026-05-20 14:49:53.000000','2026-05-20 14:49:53.000000',66),(26,'ACTIVE',_binary '','2026-05-20 14:49:53.000000',6,'sales.manager@epms.local','MGR002',26,'Sales Manager','2026-01-01',NULL,NULL,_binary '\0','$2y$10$6q0YhfHefBEkSLI1zYhEyutlcGsVpVyRNY/A80Y4EbqZl97JHnHne','2026-05-20 14:49:53.000000','2026-05-20 14:49:53.000000',50),(27,'ACTIVE',_binary '','2026-05-20 14:49:53.000000',6,'sales.leader@epms.local','TL002',27,'Sales Leader','2026-01-01',NULL,26,_binary '\0','$2y$10$6q0YhfHefBEkSLI1zYhEyutlcGsVpVyRNY/A80Y4EbqZl97JHnHne','2026-05-20 14:49:53.000000','2026-05-20 14:49:53.000000',53),(28,'ACTIVE',_binary '','2026-05-20 14:49:53.000000',6,'sales.employee@epms.local','EMP002',28,'Sales Employee','2026-01-01',NULL,26,_binary '\0','$2y$10$6q0YhfHefBEkSLI1zYhEyutlcGsVpVyRNY/A80Y4EbqZl97JHnHne','2026-05-20 14:49:53.000000','2026-05-20 14:49:53.000000',57);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-22 20:40:57
