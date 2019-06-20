-- MySQL dump 10.13  Distrib 5.7.26, for Linux (x86_64)
--
-- Host: localhost    Database: redb
-- ------------------------------------------------------
-- Server version	5.7.26-0ubuntu0.18.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `commands`
--

DROP TABLE IF EXISTS `commands`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `commands` (
  `name` varchar(255) DEFAULT NULL,
  `message` varchar(2000) DEFAULT NULL,
  `made_by` varchar(255) DEFAULT NULL,
  `timestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `server_id` varchar(18) DEFAULT NULL,
  `request_id` varchar(18) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `commands`
--

LOCK TABLES `commands` WRITE;
/*!40000 ALTER TABLE `commands` DISABLE KEYS */;
INSERT INTO `commands` VALUES ('anotherday','another nickel','87525135241728000','2019-06-09 09:30:54','291367115565301763','0'),('mention','@sriRacha','87525135241728000','2019-06-11 13:34:26','291367115565301763','0'),('timestamp','this is a test of timestamp function','87525135241728000','2019-06-11 23:04:57','291367115565301763','0'),('unprivileged','something','481538860610879520','2019-06-15 04:13:45','291367115565301763','0'),('arjun','arjun gargles peanut butter','251108938681024527','2019-06-17 02:04:39','572846523801403414','0'),('clown','I get clowned :clown_face: for being myself. I\'m 30 :man:, I rap :boom:, I\'m a goofball :nerd_face:, I wear white :cloud: contacts :eyes:, skateboard :snowboarder:, and watch :tv: Family Guy :nauseated_face: religiously :man-bowing:','87525135241728000','2019-06-17 05:05:48','572846523801403414','0'),('anotherone','666','481538860610879520','2019-06-18 20:09:57','291367115565301763','0');
/*!40000 ALTER TABLE `commands` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quotes`
--

DROP TABLE IF EXISTS `quotes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `quotes` (
  `message` varchar(2000) DEFAULT NULL,
  `user` varchar(18) DEFAULT NULL,
  `timestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quotes`
--

LOCK TABLES `quotes` WRITE;
/*!40000 ALTER TABLE `quotes` DISABLE KEYS */;
INSERT INTO `quotes` VALUES ('new spam phone game','231149079290314753','2019-06-18 18:48:58');
/*!40000 ALTER TABLE `quotes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rules`
--

DROP TABLE IF EXISTS `rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `rules` (
  `number` tinyint(2) DEFAULT NULL,
  `text` varchar(1024) DEFAULT NULL,
  `lastUpdated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rules`
--

LOCK TABLES `rules` WRITE;
/*!40000 ALTER TABLE `rules` DISABLE KEYS */;
INSERT INTO `rules` VALUES (1,'__Respect:__ Being intentionally negative or toxic towards other members is unacceptable. Sharing instances of toxic behavior that you provoked in-game or out-of-game is also unacceptable. This includes discrimination against race, gender, sexuality, or religion.','2019-06-17 19:48:02'),(2,'__Spamming:__ Spamming any channel with repeated messages, repeated images, an unnecessarily long chain of messages, or any behavior that might be considered spam is not acceptable.','2019-06-17 19:48:34'),(3,'__Role Ping/Mentions:__ You are not permitted to ping ANY role unless you are affiliated with the organization in some way. <@291355097919913985> will automatically mute you and delete your message if you attempt to do this. Mentioning a user repeatedly when they do not wish to be mentioned is also unacceptable.','2019-06-17 19:48:55'),(4,'__Academic Integrity:__ Rutgers Esports does not condone any actions that violate the school’s academic integrity policy. This server is not to be used for the buying and selling of homework, essays, exams, or any other form of academic dishonesty.','2019-06-17 19:49:19'),(5,'__NSFW:__ No content that could be considered 18+ is allowed, and will be removed immediately, as well as jokes about violence, suicide, or any comments that are sexual in nature.','2019-06-17 19:49:38'),(6,'__No Illegal Activity:__ Do not share illegal content in this server. This includes, but is not limited to, pirated media, pirated software, and buying and selling of illegal objects or substances.','2019-06-17 19:49:55'),(7,'__No advertising:__ If you want to advertise in our server you must DM an Admin or Moderator first. Advertising without permission will lead to your message being deleted along with a warning. This excludes messages in #self-promo .','2019-06-17 19:50:12');
/*!40000 ALTER TABLE `rules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `settings`
--

DROP TABLE IF EXISTS `settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `settings` (
  `name` varchar(255) DEFAULT NULL,
  `options` varchar(255) DEFAULT NULL,
  `server` varchar(18) DEFAULT NULL,
  `user` varchar(18) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `settings`
--

LOCK TABLES `settings` WRITE;
/*!40000 ALTER TABLE `settings` DISABLE KEYS */;
INSERT INTO `settings` VALUES ('prefix','-','291367115565301763',NULL),('prefix','$','572846523801403414','532340605356081162'),('prefix','.','526275183162425355',NULL),('chain','on','526275183162425355',NULL),('log','on','526275183162425355',NULL),('prefix','$','291367115565301763','87525135241728000'),('command: ping','on','291367115565301763',NULL);
/*!40000 ALTER TABLE `settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `userwarnings`
--

DROP TABLE IF EXISTS `userwarnings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `userwarnings` (
  `user_id` varchar(18) DEFAULT NULL,
  `message` varchar(2000) DEFAULT NULL,
  `rule_numbers` varchar(20) DEFAULT NULL,
  `timestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `channel` varchar(18) DEFAULT NULL,
  `server` varchar(18) DEFAULT NULL,
  `message_id` varchar(18) DEFAULT NULL,
  `notes` varchar(1024) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `userwarnings`
--

LOCK TABLES `userwarnings` WRITE;
/*!40000 ALTER TABLE `userwarnings` DISABLE KEYS */;
INSERT INTO `userwarnings` VALUES ('87525135241728000','asdjklasjdl','3 7','2019-06-17 19:57:13','567935304447819788','291367115565301763','590268699554873362','eyreyryeyueowyruoiweur');
/*!40000 ALTER TABLE `userwarnings` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2019-06-20  2:29:49
