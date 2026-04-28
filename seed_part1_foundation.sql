-- ================================================================
-- EPMS TEST DATA - PART 1: Foundation Tables
-- All user passwords = "password"
-- BCrypt hash: $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
-- ================================================================
SET FOREIGN_KEY_CHECKS = 0;

-- ---- Position Levels ----
INSERT IGNORE INTO position_levels (id, level_code) VALUES
(2,'L02'),(3,'L03'),(4,'L04'),(5,'L05'),(6,'L06');

-- ---- Departments ----
INSERT IGNORE INTO department (id, department_name, department_code, status, created_at, created_by) VALUES
(3,'Human Resources','HR',b'1','2026-01-01 08:00:00','system'),
(4,'Information Technology','IT',b'1','2026-01-01 08:00:00','system'),
(5,'Finance & Accounting','FIN',b'1','2026-01-01 08:00:00','system'),
(6,'Marketing & Sales','MKT',b'1','2026-01-01 08:00:00','system'),
(7,'Operations','OPS',b'1','2026-01-01 08:00:00','system'),
(8,'Legal & Compliance','LGL',b'1','2026-01-01 08:00:00','system'),
(9,'Customer Service','CS',b'1','2026-01-01 08:00:00','system');

-- ---- Positions ----
INSERT IGNORE INTO positions (id, position_title, level_id, status, created_at, description, created_by) VALUES
(2,'HR Manager',2,b'1','2026-01-01 08:00:00','Manages HR operations','system'),
(3,'HR Officer',3,b'1','2026-01-01 08:00:00','HR operations and recruitment','system'),
(4,'Senior Developer',2,b'1','2026-01-01 08:00:00','Leads software development','system'),
(5,'Software Engineer',3,b'1','2026-01-01 08:00:00','Software development','system'),
(6,'IT Support Specialist',4,b'1','2026-01-01 08:00:00','IT infrastructure support','system'),
(7,'Finance Manager',2,b'1','2026-01-01 08:00:00','Manages finance department','system'),
(8,'Accountant',3,b'1','2026-01-01 08:00:00','Accounting and bookkeeping','system'),
(9,'Marketing Manager',2,b'1','2026-01-01 08:00:00','Manages marketing campaigns','system'),
(10,'Sales Executive',4,b'1','2026-01-01 08:00:00','Sales and client management','system'),
(11,'Operations Manager',2,b'1','2026-01-01 08:00:00','Manages daily operations','system'),
(12,'Legal Counsel',2,b'1','2026-01-01 08:00:00','Legal advice and compliance','system'),
(13,'Business Analyst',3,b'1','2026-01-01 08:00:00','Business process analysis','system'),
(14,'Project Manager',2,b'1','2026-01-01 08:00:00','Manages projects','system'),
(15,'Customer Service Manager',2,b'1','2026-01-01 08:00:00','Manages CS team','system'),
(16,'Data Analyst',3,b'1','2026-01-01 08:00:00','Data analysis and reporting','system');

-- ---- Employees (IDs 2-21) ----
INSERT IGNORE INTO employee (id, first_name, last_name, gender, phone_number, date_of_birth, contact_address, permanent_address, email, active, position_id, staff_nrc, marital_status, religion, race) VALUES
(2,'Aye Aye','Win','Female','09-421234567','1988-03-15','No.15 Pyay Rd, Yangon','Yangon','ayeayewin@epms.com',b'1',2,'12/MaYaNa(N)123456','Married','Buddhism','Bamar'),
(3,'Kyaw Myo','Thu','Male','09-431234567','1992-07-20','No.22 Bogyoke Rd, Yangon','Yangon','kyawmyothu@epms.com',b'1',3,'12/LaGaNa(N)234567','Single','Buddhism','Bamar'),
(4,'Zaw','Lin','Male','09-441234567','1990-11-05','No.8 University Ave, Yangon','Yangon','zawlin@epms.com',b'1',4,'12/OhKaMa(N)345678','Married','Buddhism','Bamar'),
(5,'Nay Min','Oo','Male','09-451234567','1995-04-18','No.45 Thamada Rd, Yangon','Yangon','nayminoo@epms.com',b'1',5,'12/PaBeNa(N)456789','Single','Buddhism','Bamar'),
(6,'Su Su','Hlaing','Female','09-461234567','1993-09-25','No.33 Insein Rd, Yangon','Yangon','susuhlaing@epms.com',b'1',5,'12/PaPhaNa(N)567890','Single','Buddhism','Bamar'),
(7,'Phyo','Wai','Male','09-471234567','1997-02-12','No.17 Waizayandar Rd, Yangon','Yangon','phyowai@epms.com',b'1',6,'12/TaKaNa(N)678901','Single','Buddhism','Bamar'),
(8,'Myat','Noe','Female','09-481234567','1987-06-30','No.56 Merchant Rd, Yangon','Yangon','myatnoe@epms.com',b'1',7,'12/MaYaNa(N)789012','Married','Buddhism','Bamar'),
(9,'Thida','Oo','Female','09-491234567','1994-12-08','No.28 Sule Pagoda Rd, Yangon','Yangon','thidaoo@epms.com',b'1',8,'12/LaGaNa(N)890123','Single','Buddhism','Bamar'),
(10,'Win','Kyaw','Male','09-501234567','1991-08-22','No.11 Anawrahta Rd, Yangon','Yangon','winkyaw@epms.com',b'1',8,'12/OhKaMa(N)901234','Married','Buddhism','Bamar'),
(11,'May','Thu','Female','09-511234567','1989-01-14','No.67 Kaba Aye Pagoda Rd, Yangon','Yangon','maythu@epms.com',b'1',9,'12/PaBeNa(N)012345','Married','Buddhism','Bamar'),
(12,'Zin','Mar','Female','09-521234567','1996-05-03','No.39 Natmauk Rd, Yangon','Yangon','zinmar@epms.com',b'1',10,'12/PaPhaNa(N)111222','Single','Buddhism','Bamar'),
(13,'Khin','Myat','Female','09-531234567','1998-10-17','No.72 Parami Rd, Yangon','Yangon','khinmyat@epms.com',b'1',10,'12/TaKaNa(N)222333','Single','Buddhism','Bamar'),
(14,'Aung','Ko','Male','09-541234567','1986-03-28','No.5 Pyay Rd, Yangon','Yangon','aungko@epms.com',b'1',11,'12/MaYaNa(N)333444','Married','Buddhism','Bamar'),
(15,'Ye','Naing','Male','09-551234567','1993-07-11','No.84 Bo Myat Tun Rd, Yangon','Yangon','yenaing@epms.com',b'1',14,'12/LaGaNa(N)444555','Single','Buddhism','Bamar'),
(16,'Hla','Hla','Female','09-561234567','1995-11-29','No.21 Inya Rd, Yangon','Yangon','hlahla@epms.com',b'1',13,'12/OhKaMa(N)555666','Single','Buddhism','Bamar'),
(17,'Tin','Maung','Male','09-571234567','1983-04-07','No.98 Shwegondaing Rd, Yangon','Yangon','tinmaung@epms.com',b'1',12,'12/PaBeNa(N)666777','Married','Buddhism','Bamar'),
(18,'Shwe','Sin','Female','09-581234567','1994-08-16','No.14 Strand Rd, Yangon','Yangon','shwesin@epms.com',b'1',8,'12/PaPhaNa(N)777888','Single','Buddhism','Bamar'),
(19,'Moe','Kyaw','Male','09-591234567','1992-02-23','No.47 Botahtaung Rd, Yangon','Yangon','moekyaw@epms.com',b'1',8,'12/TaKaNa(N)888999','Married','Buddhism','Bamar'),
(20,'Phyu','Phyu','Female','09-601234567','1997-06-09','No.63 Lower Pazundaung Rd, Yangon','Yangon','phyuphyu@epms.com',b'1',10,'12/MaYaNa(N)999000','Single','Buddhism','Bamar'),
(21,'Lin','Lin','Female','09-611234567','1990-12-31','No.31 U Wisara Rd, Yangon','Yangon','linlin@epms.com',b'1',15,'12/LaGaNa(N)000111','Married','Buddhism','Bamar');

-- ---- Users (IDs 5-21, linked to employees above) ----
INSERT IGNORE INTO users (id, full_name, email, password, active, employee_id, employee_code, position, department_id, join_date, account_status, must_change_password, created_at) VALUES
(5,'Aye Aye Win','ayeayewin@epms.com','$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',b'1',2,'EMP005','HR Manager',3,'2023-01-15','ACTIVE',b'0','2026-01-01 08:00:00'),
(6,'Kyaw Myo Thu','kyawmyothu@epms.com','$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',b'1',3,'EMP006','HR Officer',3,'2023-03-10','ACTIVE',b'0','2026-01-01 08:00:00'),
(7,'Zaw Lin','zawlin@epms.com','$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',b'1',4,'EMP007','Senior Developer',4,'2022-06-01','ACTIVE',b'0','2026-01-01 08:00:00'),
(8,'Nay Min Oo','nayminoo@epms.com','$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',b'1',5,'EMP008','Software Engineer',4,'2023-08-15','ACTIVE',b'0','2026-01-01 08:00:00'),
(9,'Su Su Hlaing','susuhlaing@epms.com','$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',b'1',6,'EMP009','Software Engineer',4,'2023-05-20','ACTIVE',b'0','2026-01-01 08:00:00'),
(10,'Phyo Wai','phyowai@epms.com','$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',b'1',7,'EMP010','IT Support Specialist',4,'2024-01-10','ACTIVE',b'0','2026-01-01 08:00:00'),
(11,'Myat Noe','myatnoe@epms.com','$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',b'1',8,'EMP011','Finance Manager',5,'2021-09-01','ACTIVE',b'0','2026-01-01 08:00:00'),
(12,'Thida Oo','thidaoo@epms.com','$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',b'1',9,'EMP012','Accountant',5,'2023-02-14','ACTIVE',b'0','2026-01-01 08:00:00'),
(13,'Win Kyaw','winkyaw@epms.com','$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',b'1',10,'EMP013','Accountant',5,'2022-11-30','ACTIVE',b'0','2026-01-01 08:00:00'),
(14,'May Thu','maythu@epms.com','$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',b'1',11,'EMP014','Marketing Manager',6,'2021-04-05','ACTIVE',b'0','2026-01-01 08:00:00'),
(15,'Zin Mar','zinmar@epms.com','$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',b'1',12,'EMP015','Sales Executive',6,'2024-03-01','ACTIVE',b'0','2026-01-01 08:00:00'),
(16,'Khin Myat','khinmyat@epms.com','$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',b'1',13,'EMP016','Sales Executive',6,'2024-06-15','ACTIVE',b'0','2026-01-01 08:00:00'),
(17,'Aung Ko','aungko@epms.com','$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',b'1',14,'EMP017','Operations Manager',7,'2020-07-01','ACTIVE',b'0','2026-01-01 08:00:00'),
(18,'Ye Naing','yenaing@epms.com','$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',b'1',15,'EMP018','Project Manager',7,'2022-10-01','ACTIVE',b'0','2026-01-01 08:00:00'),
(19,'Tin Maung','tinmaung@epms.com','$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',b'1',17,'EMP019','Legal Counsel',8,'2021-02-15','ACTIVE',b'0','2026-01-01 08:00:00'),
(20,'Shwe Sin','shwesin@epms.com','$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',b'1',18,'EMP020','Accountant',1,'2023-09-01','ACTIVE',b'0','2026-01-01 08:00:00'),
(21,'Moe Kyaw','moekyaw@epms.com','$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',b'1',19,'EMP021','Accountant',1,'2022-12-01','ACTIVE',b'0','2026-01-01 08:00:00');

-- ---- User Roles ----
INSERT IGNORE INTO user_roles (user_id, role_id) VALUES
(5,2),(6,2),  -- HR role for HR staff
(7,3),(8,3),(9,3),(10,3),   -- EMPLOYEE role for IT
(11,3),(12,3),(13,3),        -- EMPLOYEE role for Finance
(14,3),(15,3),(16,3),        -- EMPLOYEE role for Marketing
(17,3),(18,3),               -- EMPLOYEE role for Operations
(19,3),(20,3),(21,3);        -- EMPLOYEE role for Legal / Banking

-- ---- Employee Departments ----
INSERT IGNORE INTO employee_department (id, employee_id, department_id, currentdepartment, assignBy, startdate) VALUES
(2,2,3,'Human Resources','HR Admin','2023-01-15'),
(3,3,3,'Human Resources','HR Admin','2023-03-10'),
(4,4,4,'Information Technology','HR Admin','2022-06-01'),
(5,5,4,'Information Technology','HR Admin','2023-08-15'),
(6,6,4,'Information Technology','HR Admin','2023-05-20'),
(7,7,4,'Information Technology','HR Admin','2024-01-10'),
(8,8,5,'Finance & Accounting','HR Admin','2021-09-01'),
(9,9,5,'Finance & Accounting','HR Admin','2023-02-14'),
(10,10,5,'Finance & Accounting','HR Admin','2022-11-30'),
(11,11,6,'Marketing & Sales','HR Admin','2021-04-05'),
(12,12,6,'Marketing & Sales','HR Admin','2024-03-01'),
(13,13,6,'Marketing & Sales','HR Admin','2024-06-15'),
(14,14,7,'Operations','HR Admin','2020-07-01'),
(15,15,7,'Operations','HR Admin','2022-10-01'),
(16,16,7,'Operations','HR Admin','2023-04-01'),
(17,17,8,'Legal & Compliance','HR Admin','2021-02-15'),
(18,18,1,'Banking','HR Admin','2023-09-01'),
(19,19,1,'Banking','HR Admin','2022-12-01'),
(20,20,1,'Banking','HR Admin','2024-01-20'),
(21,21,9,'Customer Service','HR Admin','2020-08-01');

-- ---- Teams (15 teams across departments) ----
INSERT IGNORE INTO team (id, team_name, team_goal, status, created_date, department_id, created_by_id, team_leader_id) VALUES
(1,'Alpha Dev Squad','Build core banking platform v2','ACTIVE','2026-01-10',4,5,7),
(2,'Beta QA Team','Ensure software quality standards','ACTIVE','2026-01-15',4,5,8),
(3,'Finance Ops Team','Streamline monthly reporting','ACTIVE','2026-01-20',5,5,11),
(4,'Audit & Compliance','Conduct quarterly audits','ACTIVE','2026-02-01',5,5,13),
(5,'Digital Marketing','Run Q2 digital campaigns','ACTIVE','2026-02-05',6,5,14),
(6,'Sales Growth Unit','Expand client base by 20%','ACTIVE','2026-02-10',6,5,15),
(7,'Operations Core','Improve process efficiency','ACTIVE','2026-02-15',7,5,17),
(8,'Legal Review Board','Review and update contracts','ACTIVE','2026-03-01',8,5,19),
(9,'Customer Success','Achieve 95% satisfaction rate','ACTIVE','2026-03-05',9,5,21),
(10,'Banking Innovation','Develop new banking products','ACTIVE','2026-03-10',1,5,20),
(11,'HR Transformation','Digitize HR processes','ACTIVE','2026-03-15',3,5,5),
(12,'Cloud Migration','Migrate infra to AWS','ACTIVE','2026-03-20',4,5,7),
(13,'Risk Management','Identify and mitigate risks','ACTIVE','2026-04-01',5,5,11),
(14,'Brand Refresh','Rebrand marketing materials','INACTIVE','2026-04-05',6,5,14),
(15,'IT Security','Improve cybersecurity posture','ACTIVE','2026-04-10',4,5,7);

-- ---- Team Members ----
INSERT IGNORE INTO team_member (id, team_id, employee_id, member_user_id, started_date) VALUES
(1,1,4,7,'2026-01-10'),(2,1,5,8,'2026-01-10'),(3,1,6,9,'2026-01-10'),
(4,2,5,8,'2026-01-15'),(5,2,6,9,'2026-01-15'),(6,2,7,10,'2026-01-15'),
(7,3,8,11,'2026-01-20'),(8,3,9,12,'2026-01-20'),(9,3,10,13,'2026-01-20'),
(10,4,9,12,'2026-02-01'),(11,4,10,13,'2026-02-01'),
(12,5,11,14,'2026-02-05'),(13,5,12,15,'2026-02-05'),(14,5,13,16,'2026-02-05'),
(15,6,12,15,'2026-02-10'),(16,6,13,16,'2026-02-10'),
(17,7,14,17,'2026-02-15'),(18,7,15,18,'2026-02-15'),(19,7,16,17,'2026-02-15'),
(20,8,17,19,'2026-03-01'),
(21,9,21,21,'2026-03-05'),
(22,10,18,20,'2026-03-10'),(23,10,19,21,'2026-03-10'),(24,10,20,20,'2026-03-10'),
(25,11,2,5,'2026-03-15'),(26,11,3,6,'2026-03-15'),
(27,12,4,7,'2026-03-20'),(28,12,7,10,'2026-03-20'),
(29,13,8,11,'2026-04-01'),(30,13,9,12,'2026-04-01'),
(31,14,11,14,'2026-04-05'),(32,14,12,15,'2026-04-05'),
(33,15,7,10,'2026-04-10'),(34,15,5,8,'2026-04-10');

SET FOREIGN_KEY_CHECKS = 1;
SELECT 'Part 1 seed complete.' AS status;
