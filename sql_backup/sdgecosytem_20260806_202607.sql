--
-- PostgreSQL database dump
--

\restrict EZWkILyH7jfx83gOiTaHZHAZ3PjgYhWVwo96wO2fewcKQG6tcCzB3TBJxlnLWaH

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

-- Started on 2026-08-06 20:26:13

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 5 (class 2615 OID 27753)
-- Name: public; Type: SCHEMA; Schema: -; Owner: sdgadmin
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO sdgadmin;

--
-- TOC entry 4452 (class 0 OID 0)
-- Dependencies: 5
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: sdgadmin
--

COMMENT ON SCHEMA public IS '';


--
-- TOC entry 915 (class 1247 OID 27814)
-- Name: BadgeCriteriaType; Type: TYPE; Schema: public; Owner: sdgadmin
--

CREATE TYPE public."BadgeCriteriaType" AS ENUM (
    'MISSIONS_COMPLETED',
    'QUIZZES_PASSED',
    'CONTENT_COMPLETED',
    'ACTIVITY_METRIC',
    'APPROVED_SUBMISSIONS',
    'RECYCLING_APPROVED'
);


ALTER TYPE public."BadgeCriteriaType" OWNER TO sdgadmin;

--
-- TOC entry 912 (class 1247 OID 27806)
-- Name: BadgeTier; Type: TYPE; Schema: public; Owner: sdgadmin
--

CREATE TYPE public."BadgeTier" AS ENUM (
    'BRONZE',
    'SILVER',
    'GOLD'
);


ALTER TYPE public."BadgeTier" OWNER TO sdgadmin;

--
-- TOC entry 909 (class 1247 OID 27798)
-- Name: ContentStatus; Type: TYPE; Schema: public; Owner: sdgadmin
--

CREATE TYPE public."ContentStatus" AS ENUM (
    'DRAFT',
    'PUBLISHED',
    'ARCHIVED'
);


ALTER TYPE public."ContentStatus" OWNER TO sdgadmin;

--
-- TOC entry 903 (class 1247 OID 27782)
-- Name: MissionStatus; Type: TYPE; Schema: public; Owner: sdgadmin
--

CREATE TYPE public."MissionStatus" AS ENUM (
    'DRAFT',
    'ACTIVE',
    'ARCHIVED'
);


ALTER TYPE public."MissionStatus" OWNER TO sdgadmin;

--
-- TOC entry 900 (class 1247 OID 27774)
-- Name: MissionType; Type: TYPE; Schema: public; Owner: sdgadmin
--

CREATE TYPE public."MissionType" AS ENUM (
    'QUANTITY_BASED',
    'STREAK_BASED',
    'TIME_LIMITED'
);


ALTER TYPE public."MissionType" OWNER TO sdgadmin;

--
-- TOC entry 918 (class 1247 OID 27824)
-- Name: PointsEventStatus; Type: TYPE; Schema: public; Owner: sdgadmin
--

CREATE TYPE public."PointsEventStatus" AS ENUM (
    'PENDING',
    'SENT',
    'FAILED'
);


ALTER TYPE public."PointsEventStatus" OWNER TO sdgadmin;

--
-- TOC entry 921 (class 1247 OID 27832)
-- Name: PointsEventType; Type: TYPE; Schema: public; Owner: sdgadmin
--

CREATE TYPE public."PointsEventType" AS ENUM (
    'MISSION_APPROVED',
    'MISSION_COMPLETED',
    'RECYCLING_APPROVED',
    'REWARD_REDEEMED',
    'REWARD_REFUNDED',
    'ADMIN_ADJUSTMENT'
);


ALTER TYPE public."PointsEventType" OWNER TO sdgadmin;

--
-- TOC entry 975 (class 1247 OID 28216)
-- Name: RecyclingQrStatus; Type: TYPE; Schema: public; Owner: sdgadmin
--

CREATE TYPE public."RecyclingQrStatus" AS ENUM (
    'ISSUED',
    'CLAIMED',
    'EXPIRED',
    'INVALIDATED'
);


ALTER TYPE public."RecyclingQrStatus" OWNER TO sdgadmin;

--
-- TOC entry 972 (class 1247 OID 28210)
-- Name: RecyclingSubmissionSource; Type: TYPE; Schema: public; Owner: sdgadmin
--

CREATE TYPE public."RecyclingSubmissionSource" AS ENUM (
    'MANUAL',
    'QR'
);


ALTER TYPE public."RecyclingSubmissionSource" OWNER TO sdgadmin;

--
-- TOC entry 969 (class 1247 OID 28202)
-- Name: RecyclingSubmissionStatus; Type: TYPE; Schema: public; Owner: sdgadmin
--

CREATE TYPE public."RecyclingSubmissionStatus" AS ENUM (
    'PENDING_REVIEW',
    'APPROVED',
    'REJECTED'
);


ALTER TYPE public."RecyclingSubmissionStatus" OWNER TO sdgadmin;

--
-- TOC entry 966 (class 1247 OID 28194)
-- Name: RedemptionStatus; Type: TYPE; Schema: public; Owner: sdgadmin
--

CREATE TYPE public."RedemptionStatus" AS ENUM (
    'RESERVED',
    'COMPLETED',
    'CANCELLED'
);


ALTER TYPE public."RedemptionStatus" OWNER TO sdgadmin;

--
-- TOC entry 897 (class 1247 OID 27769)
-- Name: Role; Type: TYPE; Schema: public; Owner: sdgadmin
--

CREATE TYPE public."Role" AS ENUM (
    'STUDENT',
    'ADMIN'
);


ALTER TYPE public."Role" OWNER TO sdgadmin;

--
-- TOC entry 906 (class 1247 OID 27790)
-- Name: SubmissionStatus; Type: TYPE; Schema: public; Owner: sdgadmin
--

CREATE TYPE public."SubmissionStatus" AS ENUM (
    'PENDING_REVIEW',
    'APPROVED',
    'REJECTED',
    'ONGOING'
);


ALTER TYPE public."SubmissionStatus" OWNER TO sdgadmin;

--
-- TOC entry 924 (class 1247 OID 27836)
-- Name: UploadPurpose; Type: TYPE; Schema: public; Owner: sdgadmin
--

CREATE TYPE public."UploadPurpose" AS ENUM (
    'MISSION_PROOF',
    'CONTENT_IMAGE',
    'MISSION_IMAGE',
    'RECYCLING_PROOF',
    'REWARD_IMAGE'
);


ALTER TYPE public."UploadPurpose" OWNER TO sdgadmin;

--
-- TOC entry 270 (class 1255 OID 28191)
-- Name: create_mission_completion_points_event(); Type: FUNCTION; Schema: public; Owner: sdgadmin
--

CREATE FUNCTION public.create_mission_completion_points_event() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  mission_record RECORD;
  completing_submission_id TEXT;
  completing_reviewed_at TIMESTAMP(3);
  next_id TEXT;
BEGIN
  IF NEW.status <> 'APPROVED' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO mission_record
  FROM "Mission"
  WHERE id = NEW."missionId";

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "PointsEvent"
    WHERE "userId" = NEW."userId"
      AND "missionId" = NEW."missionId"
      AND "eventType" = 'MISSION_COMPLETED'
  ) THEN
    RETURN NEW;
  END IF;

  IF mission_record.type = 'QUANTITY_BASED' THEN
    IF mission_record."targetQuantity" IS NULL THEN
      SELECT id, "reviewedAt"
      INTO completing_submission_id, completing_reviewed_at
      FROM "MissionSubmission"
      WHERE "missionId" = NEW."missionId"
        AND "userId" = NEW."userId"
        AND status = 'APPROVED'
      ORDER BY "submittedAt", id
      LIMIT 1;
    ELSE
      SELECT id, "reviewedAt"
      INTO completing_submission_id, completing_reviewed_at
      FROM (
        SELECT
          id,
          "reviewedAt",
          "submittedAt",
          SUM(COALESCE(quantity, 0)) OVER (ORDER BY "submittedAt", id) AS running_quantity
        FROM "MissionSubmission"
        WHERE "missionId" = NEW."missionId"
          AND "userId" = NEW."userId"
          AND status = 'APPROVED'
      ) progress
      WHERE running_quantity >= mission_record."targetQuantity"
      ORDER BY "submittedAt", id
      LIMIT 1;
    END IF;
  ELSIF mission_record.type = 'STREAK_BASED' THEN
    IF mission_record."targetDays" IS NULL THEN
      SELECT id, "reviewedAt"
      INTO completing_submission_id, completing_reviewed_at
      FROM "MissionSubmission"
      WHERE "missionId" = NEW."missionId"
        AND "userId" = NEW."userId"
        AND status = 'APPROVED'
      ORDER BY "submittedAt", id
      LIMIT 1;
    ELSE
      SELECT id, "reviewedAt"
      INTO completing_submission_id, completing_reviewed_at
      FROM "MissionSubmission"
      WHERE "missionId" = NEW."missionId"
        AND "userId" = NEW."userId"
        AND status = 'APPROVED'
      ORDER BY "submittedAt", id
      OFFSET GREATEST(mission_record."targetDays" - 1, 0)
      LIMIT 1;
    END IF;
  ELSIF mission_record.type = 'TIME_LIMITED' THEN
    SELECT id, "reviewedAt"
    INTO completing_submission_id, completing_reviewed_at
    FROM "MissionSubmission"
    WHERE "missionId" = NEW."missionId"
      AND "userId" = NEW."userId"
      AND status = 'APPROVED'
    ORDER BY "submittedAt", id
    LIMIT 1;
  END IF;

  IF completing_submission_id IS NULL THEN
    RETURN NEW;
  END IF;

  next_id := 'PEV' || LPAD(nextval('"PointsEvent_id_seq"')::text, 3, '0');

  INSERT INTO "PointsEvent" (
    id,
    "userId",
    "missionId",
    "submissionId",
    points,
    "eventType",
    status,
    "approvedAt",
    "createdAt",
    "updatedAt"
  )
  VALUES (
    next_id,
    NEW."userId",
    NEW."missionId",
    completing_submission_id,
    mission_record.points,
    'MISSION_COMPLETED',
    'SENT',
    COALESCE(completing_reviewed_at, NOW()),
    NOW(),
    NOW()
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;


ALTER FUNCTION public.create_mission_completion_points_event() OWNER TO sdgadmin;

--
-- TOC entry 272 (class 1255 OID 28494)
-- Name: create_recycling_approval_points_event(); Type: FUNCTION; Schema: public; Owner: sdgadmin
--

CREATE FUNCTION public.create_recycling_approval_points_event() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  next_id TEXT;
BEGIN
  IF NEW.status <> 'APPROVED' THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "PointsEvent"
    WHERE "recyclingSubmissionId" = NEW.id
      AND "eventType" = 'RECYCLING_APPROVED'
  ) THEN
    RETURN NEW;
  END IF;

  next_id := 'PEV' || LPAD(nextval('"PointsEvent_id_seq"')::text, 3, '0');

  INSERT INTO "PointsEvent" (
    id,
    "userId",
    "recyclingSubmissionId",
    points,
    "eventType",
    status,
    "approvedAt",
    "createdAt",
    "updatedAt"
  )
  VALUES (
    next_id,
    NEW."userId",
    NEW.id,
    NEW."pointsAwarded",
    'RECYCLING_APPROVED',
    'SENT',
    COALESCE(NEW."reviewedAt", NOW()),
    NOW(),
    NOW()
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;


ALTER FUNCTION public.create_recycling_approval_points_event() OWNER TO sdgadmin;

--
-- TOC entry 271 (class 1255 OID 28496)
-- Name: prepare_recycling_approval_points(); Type: FUNCTION; Schema: public; Owner: sdgadmin
--

CREATE FUNCTION public.prepare_recycling_approval_points() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  effective_reviewed_at TIMESTAMP(3);
  rate_per_kg INTEGER;
  raw_points INTEGER;
  daily_points INTEGER;
  remaining_points INTEGER;
BEGIN
  IF NEW.status <> 'APPROVED' THEN
    RETURN NEW;
  END IF;

  effective_reviewed_at := COALESCE(NEW."reviewedAt", NOW());
  NEW."reviewedAt" := effective_reviewed_at;

  -- API approvals already pass a calculated positive value. Keep it.
  IF NEW."pointsAwarded" > 0 THEN
    RETURN NEW;
  END IF;

  SELECT "ratePerKg" INTO rate_per_kg
  FROM "PointRate"
  WHERE material = NEW."materialType";

  IF NOT FOUND THEN
    NEW."pointsAwarded" := 0;
    RETURN NEW;
  END IF;

  raw_points := FLOOR(NEW.quantity * rate_per_kg)::integer;

  SELECT COALESCE(SUM(points), 0)::integer INTO daily_points
  FROM "PointsEvent"
  WHERE "userId" = NEW."userId"
    AND status = 'SENT'
    AND "eventType" = 'RECYCLING_APPROVED'
    AND "approvedAt" >= DATE_TRUNC('day', effective_reviewed_at)
    AND "approvedAt" < DATE_TRUNC('day', effective_reviewed_at) + INTERVAL '1 day'
    AND ("recyclingSubmissionId" IS NULL OR "recyclingSubmissionId" <> NEW.id);

  remaining_points := GREATEST(0, 1000 - daily_points);
  NEW."pointsAwarded" := LEAST(raw_points, remaining_points);

  RETURN NEW;
END;
$$;


ALTER FUNCTION public.prepare_recycling_approval_points() OWNER TO sdgadmin;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 242 (class 1259 OID 28471)
-- Name: AdminNotification; Type: TABLE; Schema: public; Owner: sdgadmin
--

CREATE TABLE public."AdminNotification" (
    id text NOT NULL,
    type text NOT NULL,
    "targetUserId" text NOT NULL,
    message text NOT NULL,
    "isRead" boolean DEFAULT false NOT NULL,
    "readAt" timestamp(3) without time zone,
    "readById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."AdminNotification" OWNER TO sdgadmin;

--
-- TOC entry 229 (class 1259 OID 27992)
-- Name: Badge; Type: TABLE; Schema: public; Owner: sdgadmin
--

CREATE TABLE public."Badge" (
    id text NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    tier public."BadgeTier" NOT NULL,
    "criteriaType" public."BadgeCriteriaType" NOT NULL,
    "criteriaValue" integer NOT NULL,
    "criteriaReferenceId" text,
    "criteriaReference" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Badge" OWNER TO sdgadmin;

--
-- TOC entry 230 (class 1259 OID 28011)
-- Name: BadgeAward; Type: TABLE; Schema: public; Owner: sdgadmin
--

CREATE TABLE public."BadgeAward" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "badgeId" text NOT NULL,
    "awardedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."BadgeAward" OWNER TO sdgadmin;

--
-- TOC entry 224 (class 1259 OID 27911)
-- Name: Content; Type: TABLE; Schema: public; Owner: sdgadmin
--

CREATE TABLE public."Content" (
    id text NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    tags text[],
    status public."ContentStatus" DEFAULT 'DRAFT'::public."ContentStatus" NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    "createdById" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    summary text,
    "imageUrl" text,
    "estimatedReadMinutes" integer DEFAULT 5 NOT NULL,
    "contentBlocks" jsonb
);


ALTER TABLE public."Content" OWNER TO sdgadmin;

--
-- TOC entry 225 (class 1259 OID 27930)
-- Name: ContentRevision; Type: TABLE; Schema: public; Owner: sdgadmin
--

CREATE TABLE public."ContentRevision" (
    id text NOT NULL,
    "contentId" text NOT NULL,
    version integer NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    tags text[],
    status public."ContentStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    summary text,
    "imageUrl" text,
    "estimatedReadMinutes" integer,
    "contentBlocks" jsonb
);


ALTER TABLE public."ContentRevision" OWNER TO sdgadmin;

--
-- TOC entry 231 (class 1259 OID 28023)
-- Name: LearningProgress; Type: TABLE; Schema: public; Owner: sdgadmin
--

CREATE TABLE public."LearningProgress" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "contentId" text NOT NULL,
    completed boolean DEFAULT false NOT NULL,
    "completionCount" integer DEFAULT 0 NOT NULL,
    "quizAttemptsCount" integer DEFAULT 0 NOT NULL,
    "passedQuizCount" integer DEFAULT 0 NOT NULL,
    "latestScore" integer,
    "lastActivityAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "bestScore" integer
);


ALTER TABLE public."LearningProgress" OWNER TO sdgadmin;

--
-- TOC entry 221 (class 1259 OID 27855)
-- Name: Mission; Type: TABLE; Schema: public; Owner: sdgadmin
--

CREATE TABLE public."Mission" (
    id text NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    type public."MissionType" NOT NULL,
    "startAt" timestamp(3) without time zone NOT NULL,
    "endAt" timestamp(3) without time zone NOT NULL,
    "submissionCap" integer,
    points integer NOT NULL,
    "autoApprove" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    status public."MissionStatus" DEFAULT 'DRAFT'::public."MissionStatus" NOT NULL,
    "createdById" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    guide jsonb,
    "imageUrl" text,
    "longDescription" text,
    "targetQuantity" integer,
    "targetDays" integer
);


ALTER TABLE public."Mission" OWNER TO sdgadmin;

--
-- TOC entry 222 (class 1259 OID 27880)
-- Name: MissionSubmission; Type: TABLE; Schema: public; Owner: sdgadmin
--

CREATE TABLE public."MissionSubmission" (
    id text NOT NULL,
    "missionId" text NOT NULL,
    "userId" text NOT NULL,
    "proofText" text,
    "proofImageUrl" text,
    quantity integer,
    status public."SubmissionStatus" DEFAULT 'PENDING_REVIEW'::public."SubmissionStatus" NOT NULL,
    "reviewNote" text,
    "reviewedById" text,
    "submittedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "reviewedAt" timestamp(3) without time zone
);


ALTER TABLE public."MissionSubmission" OWNER TO sdgadmin;

--
-- TOC entry 234 (class 1259 OID 28241)
-- Name: PointRate; Type: TABLE; Schema: public; Owner: sdgadmin
--

CREATE TABLE public."PointRate" (
    material text NOT NULL,
    "ratePerKg" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public."PointRate" OWNER TO sdgadmin;

--
-- TOC entry 223 (class 1259 OID 27894)
-- Name: PointsEvent; Type: TABLE; Schema: public; Owner: sdgadmin
--

CREATE TABLE public."PointsEvent" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "missionId" text,
    "submissionId" text,
    points integer NOT NULL,
    "eventType" public."PointsEventType" NOT NULL,
    status public."PointsEventStatus" DEFAULT 'PENDING'::public."PointsEventStatus" NOT NULL,
    "approvedAt" timestamp(3) without time zone NOT NULL,
    "lastAttemptAt" timestamp(3) without time zone,
    "errorMessage" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "recyclingSubmissionId" text,
    "redemptionId" text
);


ALTER TABLE public."PointsEvent" OWNER TO sdgadmin;

--
-- TOC entry 233 (class 1259 OID 28190)
-- Name: PointsEvent_id_seq; Type: SEQUENCE; Schema: public; Owner: sdgadmin
--

CREATE SEQUENCE public."PointsEvent_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."PointsEvent_id_seq" OWNER TO sdgadmin;

--
-- TOC entry 226 (class 1259 OID 27945)
-- Name: Quiz; Type: TABLE; Schema: public; Owner: sdgadmin
--

CREATE TABLE public."Quiz" (
    id text NOT NULL,
    "contentId" text NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    "passingScore" integer DEFAULT 4 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Quiz" OWNER TO sdgadmin;

--
-- TOC entry 228 (class 1259 OID 27975)
-- Name: QuizAttempt; Type: TABLE; Schema: public; Owner: sdgadmin
--

CREATE TABLE public."QuizAttempt" (
    id text NOT NULL,
    "quizId" text NOT NULL,
    "userId" text NOT NULL,
    score integer NOT NULL,
    "totalQuestions" integer NOT NULL,
    "correctAnswers" integer NOT NULL,
    passed boolean NOT NULL,
    answers jsonb NOT NULL,
    "attemptedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "timeSpentSeconds" integer
);


ALTER TABLE public."QuizAttempt" OWNER TO sdgadmin;

--
-- TOC entry 227 (class 1259 OID 27961)
-- Name: QuizQuestion; Type: TABLE; Schema: public; Owner: sdgadmin
--

CREATE TABLE public."QuizQuestion" (
    id text NOT NULL,
    "quizId" text NOT NULL,
    code text NOT NULL,
    "questionText" text NOT NULL,
    options text[],
    "correctAnswer" text NOT NULL,
    points integer DEFAULT 1 NOT NULL,
    CONSTRAINT "QuizQuestion_points_one_check" CHECK ((points = 1))
);


ALTER TABLE public."QuizQuestion" OWNER TO sdgadmin;

--
-- TOC entry 235 (class 1259 OID 28251)
-- Name: RecyclingQrCode; Type: TABLE; Schema: public; Owner: sdgadmin
--

CREATE TABLE public."RecyclingQrCode" (
    id text NOT NULL,
    nonce text NOT NULL,
    signature text NOT NULL,
    status public."RecyclingQrStatus" DEFAULT 'ISSUED'::public."RecyclingQrStatus" NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "issuedById" text NOT NULL,
    "claimedById" text,
    "claimedAt" timestamp(3) without time zone,
    "invalidatedById" text,
    "invalidatedAt" timestamp(3) without time zone,
    "materialType" text,
    "estimatedWeightKg" double precision,
    payload jsonb NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."RecyclingQrCode" OWNER TO sdgadmin;

--
-- TOC entry 236 (class 1259 OID 28269)
-- Name: RecyclingSubmission; Type: TABLE; Schema: public; Owner: sdgadmin
--

CREATE TABLE public."RecyclingSubmission" (
    id text NOT NULL,
    "userId" text NOT NULL,
    source public."RecyclingSubmissionSource" DEFAULT 'MANUAL'::public."RecyclingSubmissionSource" NOT NULL,
    "qrCodeId" text,
    "materialType" text NOT NULL,
    quantity double precision NOT NULL,
    "proofImageUrl" text,
    status public."RecyclingSubmissionStatus" DEFAULT 'PENDING_REVIEW'::public."RecyclingSubmissionStatus" NOT NULL,
    "pointsAwarded" integer DEFAULT 0 NOT NULL,
    "isDuplicateFlagged" boolean DEFAULT false NOT NULL,
    "reviewNote" text,
    "reviewedById" text,
    "submittedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "reviewedAt" timestamp(3) without time zone
);


ALTER TABLE public."RecyclingSubmission" OWNER TO sdgadmin;

--
-- TOC entry 239 (class 1259 OID 28317)
-- Name: Redemption; Type: TABLE; Schema: public; Owner: sdgadmin
--

CREATE TABLE public."Redemption" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "rewardId" text,
    "itemName" text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    "pointsSpent" integer NOT NULL,
    status public."RedemptionStatus" DEFAULT 'RESERVED'::public."RedemptionStatus" NOT NULL,
    "reservedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expiresAt" timestamp(3) without time zone,
    "completedAt" timestamp(3) without time zone,
    "cancelledAt" timestamp(3) without time zone,
    "cancelReason" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Redemption" OWNER TO sdgadmin;

--
-- TOC entry 240 (class 1259 OID 28336)
-- Name: RedemptionCooldown; Type: TABLE; Schema: public; Owner: sdgadmin
--

CREATE TABLE public."RedemptionCooldown" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "rewardId" text NOT NULL,
    "lastRedeemedAt" timestamp(3) without time zone,
    "countToday" integer DEFAULT 0 NOT NULL,
    "countWeek" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public."RedemptionCooldown" OWNER TO sdgadmin;

--
-- TOC entry 238 (class 1259 OID 28299)
-- Name: Reward; Type: TABLE; Schema: public; Owner: sdgadmin
--

CREATE TABLE public."Reward" (
    id text NOT NULL,
    name text NOT NULL,
    "pointsRequired" integer NOT NULL,
    stock integer DEFAULT 0 NOT NULL,
    "imageUrl" text,
    "imageUploadId" text,
    category text,
    "expiresAt" timestamp(3) without time zone,
    "isActive" boolean DEFAULT true NOT NULL,
    tier text DEFAULT 'small'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Reward" OWNER TO sdgadmin;

--
-- TOC entry 237 (class 1259 OID 28290)
-- Name: RewardTier; Type: TABLE; Schema: public; Owner: sdgadmin
--

CREATE TABLE public."RewardTier" (
    tier text NOT NULL,
    "pointsRequired" integer NOT NULL
);


ALTER TABLE public."RewardTier" OWNER TO sdgadmin;

--
-- TOC entry 241 (class 1259 OID 28350)
-- Name: SuspiciousActivityLog; Type: TABLE; Schema: public; Owner: sdgadmin
--

CREATE TABLE public."SuspiciousActivityLog" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "activityType" text NOT NULL,
    severity text DEFAULT 'medium'::text NOT NULL,
    details text,
    "detectedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."SuspiciousActivityLog" OWNER TO sdgadmin;

--
-- TOC entry 232 (class 1259 OID 28046)
-- Name: UploadedFile; Type: TABLE; Schema: public; Owner: sdgadmin
--

CREATE TABLE public."UploadedFile" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "missionSubmissionId" text,
    "containerName" text NOT NULL,
    "blobName" text NOT NULL,
    "fileUrl" text NOT NULL,
    "mimeType" text NOT NULL,
    "fileSize" integer NOT NULL,
    purpose public."UploadPurpose" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "recyclingSubmissionId" text,
    "rewardId" text
);


ALTER TABLE public."UploadedFile" OWNER TO sdgadmin;

--
-- TOC entry 220 (class 1259 OID 27839)
-- Name: User; Type: TABLE; Schema: public; Owner: sdgadmin
--

CREATE TABLE public."User" (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    "passwordHash" text NOT NULL,
    role public."Role" DEFAULT 'STUDENT'::public."Role" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "lastRecyclingSubmissionAt" timestamp(3) without time zone,
    "suspiciousActivityFlagged" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "deactivatedAt" timestamp(3) without time zone,
    "deactivationReason" text
);


ALTER TABLE public."User" OWNER TO sdgadmin;

--
-- TOC entry 219 (class 1259 OID 27754)
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: sdgadmin
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO sdgadmin;

--
-- TOC entry 4446 (class 0 OID 28471)
-- Dependencies: 242
-- Data for Name: AdminNotification; Type: TABLE DATA; Schema: public; Owner: sdgadmin
--

COPY public."AdminNotification" (id, type, "targetUserId", message, "isRead", "readAt", "readById", "createdAt") FROM stdin;
\.


--
-- TOC entry 4433 (class 0 OID 27992)
-- Dependencies: 229
-- Data for Name: Badge; Type: TABLE DATA; Schema: public; Owner: sdgadmin
--

COPY public."Badge" (id, slug, name, description, tier, "criteriaType", "criteriaValue", "criteriaReferenceId", "criteriaReference", "isActive", "createdAt", "updatedAt") FROM stdin;
BDG001	mission-finisher	Mission Finisher	Finish one mission by reaching its required progress target.	BRONZE	MISSIONS_COMPLETED	1	\N	\N	t	2026-08-06 09:44:42.407	2026-08-06 09:44:42.407
BDG002	mission-achiever	Mission Achiever	Finish three missions by reaching each mission's full progress target.	SILVER	MISSIONS_COMPLETED	3	\N	\N	t	2026-08-06 09:44:42.413	2026-08-06 09:44:42.413
BDG003	mission-master	Mission Master	Finish five missions by fully completing their required progress.	GOLD	MISSIONS_COMPLETED	5	\N	\N	t	2026-08-06 09:44:42.417	2026-08-06 09:44:42.417
BDG004	quiz-pass-starter	Quiz Pass Starter	Submit a quiz attempt and pass it once.	BRONZE	QUIZZES_PASSED	1	\N	\N	t	2026-08-06 09:44:42.423	2026-08-06 09:44:42.423
BDG005	quiz-pass-builder	Quiz Pass Builder	Submit and pass three quiz attempts.	SILVER	QUIZZES_PASSED	3	\N	\N	t	2026-08-06 09:44:42.428	2026-08-06 09:44:42.428
BDG006	quiz-pass-expert	Quiz Pass Expert	Submit and pass five quiz attempts.	GOLD	QUIZZES_PASSED	5	\N	\N	t	2026-08-06 09:44:42.432	2026-08-06 09:44:42.432
BDG007	content-starter	Content Starter	Complete one learning content item. Each content item only counts once.	BRONZE	CONTENT_COMPLETED	1	\N	\N	t	2026-08-06 09:44:42.436	2026-08-06 09:44:42.436
BDG008	knowledge-collector	Knowledge Collector	Complete three different learning content items.	SILVER	CONTENT_COMPLETED	3	\N	\N	t	2026-08-06 09:44:42.44	2026-08-06 09:44:42.44
BDG009	eco-scholar	Eco Scholar	Complete five different learning content items.	GOLD	CONTENT_COMPLETED	5	\N	\N	t	2026-08-06 09:44:42.445	2026-08-06 09:44:42.445
BDG010	first-approval	First Approval	Receive one approved mission submission.	BRONZE	APPROVED_SUBMISSIONS	1	\N	\N	t	2026-08-06 09:44:42.449	2026-08-06 09:44:42.449
BDG011	verified-contributor	Verified Contributor	Receive five approved mission submissions.	SILVER	APPROVED_SUBMISSIONS	5	\N	\N	t	2026-08-06 09:44:42.452	2026-08-06 09:44:42.452
BDG012	approval-champion	Approval Champion	Receive ten approved mission submissions.	GOLD	APPROVED_SUBMISSIONS	10	\N	\N	t	2026-08-06 09:44:42.457	2026-08-06 09:44:42.457
BDG013	recycling-starter	Recycling Starter	Receive one approved recycling submission outside mission proof.	BRONZE	RECYCLING_APPROVED	1	\N	\N	t	2026-08-06 09:44:42.462	2026-08-06 09:44:42.462
BDG014	recycling-regular	Recycling Regular	Receive five approved recycling submissions outside mission proof.	SILVER	RECYCLING_APPROVED	5	\N	\N	t	2026-08-06 09:44:42.466	2026-08-06 09:44:42.466
BDG015	recycling-champion	Recycling Champion	Receive ten approved recycling submissions outside mission proof.	GOLD	RECYCLING_APPROVED	10	\N	\N	t	2026-08-06 09:44:42.47	2026-08-06 09:44:42.47
\.


--
-- TOC entry 4434 (class 0 OID 28011)
-- Dependencies: 230
-- Data for Name: BadgeAward; Type: TABLE DATA; Schema: public; Owner: sdgadmin
--

COPY public."BadgeAward" (id, "userId", "badgeId", "awardedAt") FROM stdin;
AWD001	USR004	BDG013	2026-08-06 09:58:12.341
AWD002	USR002	BDG001	2026-08-06 11:06:08.422
AWD003	USR002	BDG010	2026-08-06 11:06:08.572
AWD004	USR002	BDG013	2026-08-06 11:06:08.594
AWD005	USR003	BDG013	2026-08-06 11:38:34.456
\.


--
-- TOC entry 4428 (class 0 OID 27911)
-- Dependencies: 224
-- Data for Name: Content; Type: TABLE DATA; Schema: public; Owner: sdgadmin
--

COPY public."Content" (id, slug, title, body, tags, status, version, "createdById", "createdAt", "updatedAt", summary, "imageUrl", "estimatedReadMinutes", "contentBlocks") FROM stdin;
CNT001	plastic-recycling-basics	Plastic Recycling Basics	Plastic recycling starts with knowing what each container is made from and whether it is clean enough to be processed. This guide explains how to read plastic codes, rinse common packaging, and sort bottles before they reach the recycling bin.	{plastic,sorting,cleanliness}	PUBLISHED	1	USR001	2026-08-06 09:44:42.309	2026-08-06 09:44:42.309	Learn how to identify common plastic recycling codes and sort them correctly.	https://commons.wikimedia.org/wiki/Special:FilePath/Plastic_Bottle_Recycling_Bin.jpg	6	[{"text": "Plastic recycling starts with knowing what each container is made from and whether it is clean enough to be processed. A quick rinse and correct sorting step can prevent an entire batch from becoming contaminated.", "type": "paragraph"}, {"text": "Read the Plastic Code", "type": "heading"}, {"text": "Most bottles and food containers have a small number inside the recycling triangle. PET and HDPE are usually accepted more widely, while mixed plastics may need special handling depending on your local facility.", "type": "paragraph"}, {"alt": "Sorted plastic bottles prepared for recycling", "url": "https://commons.wikimedia.org/wiki/Special:FilePath/Plastic_Bottle_Recycling_Bin.jpg", "type": "image"}, {"text": "Clean Before Sorting", "type": "heading"}, {"text": "Food residue, liquid, and greasy labels can lower recycling quality. Empty the bottle, rinse it lightly, and flatten it if your campus recycling station asks for compact items.", "type": "paragraph"}]
CNT002	paper-recycling-essentials	Paper Recycling Essentials	Paper recycling works best when paper is dry, clean, and separated from food waste. This article explains what paper can be recycled and why wet or greasy paper should be kept out of the recycling stream.	{paper,cleanliness,sorting}	PUBLISHED	1	USR001	2026-08-06 09:44:42.328	2026-08-06 09:44:42.328	Understand contamination rules and how to prepare paper for recycling.	https://commons.wikimedia.org/wiki/Special:FilePath/Recyclable_Cardboard_Packaging.jpg	5	[{"text": "Paper recycling works best when paper is dry, clean, and separated from food waste. Even a small amount of grease or moisture can make a stack of paper harder to process.", "type": "paragraph"}, {"text": "Keep Paper Dry", "type": "heading"}, {"text": "Notebook paper, clean cardboard, flyers, and envelopes are usually accepted. Tissue, greasy takeaway boxes, and wet paper should be handled as waste or compost depending on local rules.", "type": "paragraph"}, {"alt": "Clean paper and cardboard sorted for recycling", "url": "https://commons.wikimedia.org/wiki/Special:FilePath/Recycled_Paper_Pulp%2C_Post-Consumer_Waste_Recycling_Material_%2843544030305%29.jpg", "type": "image"}, {"text": "Flatten Cardboard", "type": "heading"}, {"text": "Flattening cardboard saves bin space and helps collection teams move material more efficiently. Remove plastic tape or food liners where possible before recycling.", "type": "paragraph"}]
CNT003	e-waste-recycling-awareness	E-Waste Recycling Awareness	E-waste contains valuable materials, but it can also contain batteries, heavy metals, and parts that should not enter normal bins. Learn how to store old devices safely and send them to the correct collection point.	{ewaste,safety,general}	PUBLISHED	1	USR001	2026-08-06 09:44:42.338	2026-08-06 09:44:42.338	Discover safe disposal paths for electronics and batteries on campus.	https://commons.wikimedia.org/wiki/Special:FilePath/E-Waste_Recycling_%287027059003%29.jpg	7	[{"text": "E-waste contains valuable materials, but it can also contain batteries, heavy metals, and parts that should not enter normal bins. A separate collection path keeps people and the environment safer.", "type": "paragraph"}, {"text": "Separate Batteries", "type": "heading"}, {"text": "Loose lithium batteries can be a fire risk when crushed or exposed to heat. Tape battery terminals where required and place them in a designated battery collection box.", "type": "paragraph"}, {"alt": "Electronic components prepared for recycling", "url": "https://commons.wikimedia.org/wiki/Special:FilePath/E-Waste_Recycling_%287027059003%29.jpg", "type": "image"}, {"text": "Use Approved Drop-Off Points", "type": "heading"}, {"text": "Phones, chargers, headphones, circuit boards, and small appliances should go to campus e-waste drives or certified recycling partners instead of general waste bins.", "type": "paragraph"}]
\.


--
-- TOC entry 4429 (class 0 OID 27930)
-- Dependencies: 225
-- Data for Name: ContentRevision; Type: TABLE DATA; Schema: public; Owner: sdgadmin
--

COPY public."ContentRevision" (id, "contentId", version, title, body, tags, status, "createdAt", summary, "imageUrl", "estimatedReadMinutes", "contentBlocks") FROM stdin;
CRV00101	CNT001	1	Plastic Recycling Basics	Plastic recycling starts with knowing what each container is made from and whether it is clean enough to be processed. This guide explains how to read plastic codes, rinse common packaging, and sort bottles before they reach the recycling bin.	{plastic,sorting,cleanliness}	PUBLISHED	2026-08-06 09:44:42.32	Learn how to identify common plastic recycling codes and sort them correctly.	https://commons.wikimedia.org/wiki/Special:FilePath/Plastic_Bottle_Recycling_Bin.jpg	6	[{"text": "Plastic recycling starts with knowing what each container is made from and whether it is clean enough to be processed. A quick rinse and correct sorting step can prevent an entire batch from becoming contaminated.", "type": "paragraph"}, {"text": "Read the Plastic Code", "type": "heading"}, {"text": "Most bottles and food containers have a small number inside the recycling triangle. PET and HDPE are usually accepted more widely, while mixed plastics may need special handling depending on your local facility.", "type": "paragraph"}, {"alt": "Sorted plastic bottles prepared for recycling", "url": "https://commons.wikimedia.org/wiki/Special:FilePath/Plastic_Bottle_Recycling_Bin.jpg", "type": "image"}, {"text": "Clean Before Sorting", "type": "heading"}, {"text": "Food residue, liquid, and greasy labels can lower recycling quality. Empty the bottle, rinse it lightly, and flatten it if your campus recycling station asks for compact items.", "type": "paragraph"}]
CRV00201	CNT002	1	Paper Recycling Essentials	Paper recycling works best when paper is dry, clean, and separated from food waste. This article explains what paper can be recycled and why wet or greasy paper should be kept out of the recycling stream.	{paper,cleanliness,sorting}	PUBLISHED	2026-08-06 09:44:42.334	Understand contamination rules and how to prepare paper for recycling.	https://commons.wikimedia.org/wiki/Special:FilePath/Recyclable_Cardboard_Packaging.jpg	5	[{"text": "Paper recycling works best when paper is dry, clean, and separated from food waste. Even a small amount of grease or moisture can make a stack of paper harder to process.", "type": "paragraph"}, {"text": "Keep Paper Dry", "type": "heading"}, {"text": "Notebook paper, clean cardboard, flyers, and envelopes are usually accepted. Tissue, greasy takeaway boxes, and wet paper should be handled as waste or compost depending on local rules.", "type": "paragraph"}, {"alt": "Clean paper and cardboard sorted for recycling", "url": "https://commons.wikimedia.org/wiki/Special:FilePath/Recycled_Paper_Pulp%2C_Post-Consumer_Waste_Recycling_Material_%2843544030305%29.jpg", "type": "image"}, {"text": "Flatten Cardboard", "type": "heading"}, {"text": "Flattening cardboard saves bin space and helps collection teams move material more efficiently. Remove plastic tape or food liners where possible before recycling.", "type": "paragraph"}]
CRV00301	CNT003	1	E-Waste Recycling Awareness	E-waste contains valuable materials, but it can also contain batteries, heavy metals, and parts that should not enter normal bins. Learn how to store old devices safely and send them to the correct collection point.	{ewaste,safety,general}	PUBLISHED	2026-08-06 09:44:42.348	Discover safe disposal paths for electronics and batteries on campus.	https://commons.wikimedia.org/wiki/Special:FilePath/E-Waste_Recycling_%287027059003%29.jpg	7	[{"text": "E-waste contains valuable materials, but it can also contain batteries, heavy metals, and parts that should not enter normal bins. A separate collection path keeps people and the environment safer.", "type": "paragraph"}, {"text": "Separate Batteries", "type": "heading"}, {"text": "Loose lithium batteries can be a fire risk when crushed or exposed to heat. Tape battery terminals where required and place them in a designated battery collection box.", "type": "paragraph"}, {"alt": "Electronic components prepared for recycling", "url": "https://commons.wikimedia.org/wiki/Special:FilePath/E-Waste_Recycling_%287027059003%29.jpg", "type": "image"}, {"text": "Use Approved Drop-Off Points", "type": "heading"}, {"text": "Phones, chargers, headphones, circuit boards, and small appliances should go to campus e-waste drives or certified recycling partners instead of general waste bins.", "type": "paragraph"}]
\.


--
-- TOC entry 4435 (class 0 OID 28023)
-- Dependencies: 231
-- Data for Name: LearningProgress; Type: TABLE DATA; Schema: public; Owner: sdgadmin
--

COPY public."LearningProgress" (id, "userId", "contentId", completed, "completionCount", "quizAttemptsCount", "passedQuizCount", "latestScore", "lastActivityAt", "createdAt", "updatedAt", "bestScore") FROM stdin;
PRG002001	USR002	CNT001	f	0	0	0	\N	2026-08-06 09:44:42.578	2026-08-06 09:44:42.578	2026-08-06 09:44:42.578	\N
PRG002002	USR002	CNT002	f	0	0	0	\N	2026-08-06 09:44:42.594	2026-08-06 09:44:42.594	2026-08-06 09:44:42.594	\N
PRG002003	USR002	CNT003	f	0	0	0	\N	2026-08-06 09:44:42.604	2026-08-06 09:44:42.604	2026-08-06 09:44:42.604	\N
PRG003002	USR003	CNT002	f	0	0	0	\N	2026-08-06 09:44:42.632	2026-08-06 09:44:42.632	2026-08-06 09:44:42.632	\N
PRG003003	USR003	CNT003	f	0	0	0	\N	2026-08-06 09:44:42.642	2026-08-06 09:44:42.642	2026-08-06 09:44:42.642	\N
PRG004001	USR004	CNT001	f	0	0	0	\N	2026-08-06 09:44:42.653	2026-08-06 09:44:42.653	2026-08-06 09:44:42.653	\N
PRG004002	USR004	CNT002	f	0	0	0	\N	2026-08-06 09:44:42.664	2026-08-06 09:44:42.664	2026-08-06 09:44:42.664	\N
PRG004003	USR004	CNT003	f	0	0	0	\N	2026-08-06 09:44:42.674	2026-08-06 09:44:42.674	2026-08-06 09:44:42.674	\N
PRG003001	USR003	CNT001	f	0	1	0	3	2026-08-06 11:40:38.416	2026-08-06 09:44:42.616	2026-08-06 11:40:38.427	3
\.


--
-- TOC entry 4425 (class 0 OID 27855)
-- Dependencies: 221
-- Data for Name: Mission; Type: TABLE DATA; Schema: public; Owner: sdgadmin
--

COPY public."Mission" (id, slug, title, description, type, "startAt", "endAt", "submissionCap", points, "autoApprove", "isActive", status, "createdById", "createdAt", "updatedAt", guide, "imageUrl", "longDescription", "targetQuantity", "targetDays") FROM stdin;
MIS001	bottle-count-challenge	Bottle Count Challenge	Collect and record recyclable plastic bottles this week.	QUANTITY_BASED	2026-08-06 09:44:42.189	2026-08-13 09:44:42.189	20	25	f	t	ACTIVE	USR001	2026-08-06 09:44:42.192	2026-08-06 09:44:42.192	[{"step": 1, "title": "Collect Plastic Bottles", "description": "Gather empty plastic bottles from your home, classroom, or workplace."}, {"step": 2, "title": "Sort and Count", "description": "Separate recyclable plastic bottles and count the total quantity."}, {"step": 3, "title": "Take Proof", "description": "Take a clear photo showing the collected bottles before recycling them."}, {"step": 4, "title": "Submit Mission", "description": "Upload the photo and enter the total number of bottles collected."}]	https://commons.wikimedia.org/wiki/Special:FilePath/Plastic%20bottles%20for%20recycling.jpg	Reduce plastic waste by collecting recyclable plastic bottles from your home, campus, or workplace throughout the week. Sort and count the bottles before submitting your total to encourage responsible recycling habits. Every bottle recycled contributes to a cleaner environment and helps reduce landfill waste.	20	\N
MIS002	three-day-recycling-streak	Three Day Recycling Streak	Maintain three consecutive days of recycling activity.	STREAK_BASED	2026-08-06 09:44:42.189	2026-08-13 09:44:42.189	3	40	t	t	ACTIVE	USR001	2026-08-06 09:44:42.205	2026-08-06 09:44:42.205	[{"step": 1, "title": "Recycle Daily", "description": "Complete at least one recycling activity each day for three consecutive days."}, {"step": 2, "title": "Document Your Activity", "description": "Take a photo or record proof of each day's recycling effort."}, {"step": 3, "title": "Keep Your Streak", "description": "Do not skip a day, or your streak will need to start again."}, {"step": 4, "title": "Submit Your Progress", "description": "Upload your proof after completing the three-day streak."}]	https://commons.wikimedia.org/wiki/Special:FilePath/Recyclables.JPG	Build a sustainable habit by completing at least one recycling activity each day for three consecutive days. Consistency is the key to making environmental responsibility part of your daily routine. Record your progress every day to successfully complete the challenge.	\N	3
MIS003	weekend-e-waste-drive	Weekend E-Waste Drive	Join the campus e-waste collection event and share evidence.	TIME_LIMITED	2026-08-06 09:44:42.189	2026-08-13 09:44:42.189	1	50	f	t	ACTIVE	USR001	2026-08-06 09:44:42.212	2026-08-06 09:44:42.212	[{"step": 1, "title": "Prepare E-Waste", "description": "Collect unused electronic devices or accessories that are no longer needed."}, {"step": 2, "title": "Visit the Collection Point", "description": "Bring your e-waste to the designated campus collection location during the event."}, {"step": 3, "title": "Take Proof", "description": "Capture a photo of yourself or your items at the collection point."}, {"step": 4, "title": "Submit Participation", "description": "Upload the photo as proof to complete the mission."}]	https://commons.wikimedia.org/wiki/Special:FilePath/Recycled%20Electronics%20-%20Circuit%20Boards%20(48659415958).jpg	Participate in the campus weekend e-waste collection drive by bringing unwanted electronic items for proper disposal. Recycling electronic waste prevents harmful materials from polluting the environment and allows valuable resources to be recovered. Share your participation by submitting evidence after dropping off your items.	\N	\N
\.


--
-- TOC entry 4426 (class 0 OID 27880)
-- Dependencies: 222
-- Data for Name: MissionSubmission; Type: TABLE DATA; Schema: public; Owner: sdgadmin
--

COPY public."MissionSubmission" (id, "missionId", "userId", "proofText", "proofImageUrl", quantity, status, "reviewNote", "reviewedById", "submittedAt", "reviewedAt") FROM stdin;
SUB001	MIS001	USR002	Collected 20 bottles from the cafeteria bins.	\N	20	APPROVED	\N	USR001	2026-08-06 09:44:42.536	2026-08-06 09:44:42.535
SUB002	MIS002	USR003	Maintained my recycling streak for three days.	\N	\N	PENDING_REVIEW	\N	\N	2026-08-06 09:44:42.57	\N
SUB003	MIS002	USR002	\N	\N	\N	ONGOING	\N	\N	2026-08-06 11:16:19.995	\N
SUB004	MIS003	USR002	test	https://stsdguploads.blob.core.windows.net/mission-proofs/USR002/1786015518002-mission-proofjpg	\N	APPROVED	\N	\N	2026-08-06 11:25:05.849	\N
\.


--
-- TOC entry 4438 (class 0 OID 28241)
-- Dependencies: 234
-- Data for Name: PointRate; Type: TABLE DATA; Schema: public; Owner: sdgadmin
--

COPY public."PointRate" (material, "ratePerKg") FROM stdin;
Plastic	50
Paper	20
Glass	30
Metal	60
\.


--
-- TOC entry 4427 (class 0 OID 27894)
-- Dependencies: 223
-- Data for Name: PointsEvent; Type: TABLE DATA; Schema: public; Owner: sdgadmin
--

COPY public."PointsEvent" (id, "userId", "missionId", "submissionId", points, "eventType", status, "approvedAt", "lastAttemptAt", "errorMessage", "createdAt", "updatedAt", "recyclingSubmissionId", "redemptionId") FROM stdin;
PEV001	USR002	MIS001	SUB001	25	MISSION_COMPLETED	SENT	2026-08-06 09:44:42.535	\N	\N	2026-08-06 09:44:42.542	2026-08-06 09:44:42.563	\N	\N
PEV002	USR002	\N	\N	700	RECYCLING_APPROVED	SENT	2026-08-06 09:44:42.729	\N	\N	2026-08-06 09:44:42.733	2026-08-06 09:44:42.746	RCS001	\N
PEV003	USR002	\N	\N	-100	REWARD_REDEEMED	SENT	2026-08-06 09:44:42.769	\N	\N	2026-08-06 09:44:42.777	2026-08-06 09:44:42.777	\N	RDM001
PEV004	USR002	\N	\N	-100	REWARD_REDEEMED	SENT	2026-08-04 09:44:42.769	\N	\N	2026-08-06 09:44:42.795	2026-08-06 09:44:42.795	\N	RDM002
PEV005	USR004	\N	\N	52	RECYCLING_APPROVED	SENT	2026-08-06 09:58:12.098	\N	\N	2026-08-06 09:58:12.113	2026-08-06 09:58:12.113	RCS003	\N
PEV006	USR002	\N	\N	250	RECYCLING_APPROVED	SENT	2026-08-06 19:15:00.328	\N	\N	2026-08-06 19:15:00.328	2026-08-06 19:15:00.328	RCS004	\N
PEV007	USR002	\N	\N	30	RECYCLING_APPROVED	SENT	2026-08-06 19:24:38.719	\N	\N	2026-08-06 19:24:38.719	2026-08-06 19:24:38.719	RCS005	\N
PEV008	USR002	MIS003	SUB004	50	MISSION_COMPLETED	SENT	2026-08-06 19:25:41.406	\N	\N	2026-08-06 19:25:41.406	2026-08-06 19:25:41.406	\N	\N
PEV009	USR003	\N	\N	52	RECYCLING_APPROVED	SENT	2026-08-06 09:50:45.115	\N	\N	2026-08-06 19:36:32.333	2026-08-06 19:36:32.333	RCS_TEST_PAPER_26	\N
\.


--
-- TOC entry 4430 (class 0 OID 27945)
-- Dependencies: 226
-- Data for Name: Quiz; Type: TABLE DATA; Schema: public; Owner: sdgadmin
--

COPY public."Quiz" (id, "contentId", slug, title, "passingScore", "createdAt", "updatedAt") FROM stdin;
QZ001	CNT001	plastic-recycling-basics-quiz	Plastic Recycling Basics Quiz	4	2026-08-06 09:44:42.357	2026-08-06 09:44:42.357
QZ002	CNT002	paper-recycling-essentials-quiz	Paper Recycling Essentials Quiz	4	2026-08-06 09:44:42.377	2026-08-06 09:44:42.377
QZ003	CNT003	e-waste-recycling-awareness-quiz	E-Waste Recycling Awareness Quiz	4	2026-08-06 09:44:42.392	2026-08-06 09:44:42.392
\.


--
-- TOC entry 4432 (class 0 OID 27975)
-- Dependencies: 228
-- Data for Name: QuizAttempt; Type: TABLE DATA; Schema: public; Owner: sdgadmin
--

COPY public."QuizAttempt" (id, "quizId", "userId", score, "totalQuestions", "correctAnswers", passed, answers, "attemptedAt", "timeSpentSeconds") FROM stdin;
QAT001	QZ001	USR003	3	5	3	f	{"QQ0011": "PVC", "QQ0012": "Empty and rinse it", "QQ0013": "It reduces contamination", "QQ0014": "PVC film", "QQ0015": "The batch quality drops"}	2026-08-06 11:40:38.408	98
\.


--
-- TOC entry 4431 (class 0 OID 27961)
-- Dependencies: 227
-- Data for Name: QuizQuestion; Type: TABLE DATA; Schema: public; Owner: sdgadmin
--

COPY public."QuizQuestion" (id, "quizId", code, "questionText", options, "correctAnswer", points) FROM stdin;
QQ0011	QZ001	QQ0011	Which plastic code is commonly used for water and soft drink bottles?	{PET,PVC,"Polystyrene Foam","Mixed Plastic"}	PET	1
QQ0012	QZ001	QQ0012	What should you do before putting a plastic bottle into the recycling bin?	{"Empty and rinse it","Leave liquid inside","Wrap it in tissue","Mix it with food waste"}	Empty and rinse it	1
QQ0013	QZ001	QQ0013	Why is sorting plastic by type important?	{"It reduces contamination","It makes bins heavier","It hides non-recyclables","It replaces collection labels"}	It reduces contamination	1
QQ0014	QZ001	QQ0014	Which plastic type is usually accepted more widely together with PET?	{HDPE,"PVC film","Polystyrene Foam",Melamine}	HDPE	1
QQ0015	QZ001	QQ0015	What can happen when dirty plastic packaging enters a recycling batch?	{"The batch quality drops","The plastic becomes cleaner","The bin accepts more waste","The item gains more value"}	The batch quality drops	1
QQ0021	QZ002	QQ0021	Which paper item is most suitable for recycling?	{"Clean cardboard","Greasy pizza box","Wet tissue","Food-stained wrapper"}	Clean cardboard	1
QQ0022	QZ002	QQ0022	Why should paper be kept dry before recycling?	{"Moisture lowers paper quality","Wet paper becomes plastic","Dry paper cannot be collected","Moisture removes ink automatically"}	Moisture lowers paper quality	1
QQ0023	QZ002	QQ0023	What should you do with cardboard boxes before recycling them?	{"Flatten them","Fill them with food waste","Soak them in water","Tape them into a bundle with plastic"}	Flatten them	1
QQ0024	QZ002	QQ0024	Which item should usually be kept out of the paper recycling stream?	{"Greasy takeaway box","Notebook paper","Clean envelope","Dry flyer"}	Greasy takeaway box	1
QQ0025	QZ002	QQ0025	What is the main reason to remove food residue from paper packaging?	{"To prevent contamination","To make the package heavier","To hide the paper label","To make sorting unnecessary"}	To prevent contamination	1
QQ0031	QZ003	QQ0031	Why should e-waste be collected separately from normal waste?	{"It may contain hazardous materials","It is always compostable","It is lighter than paper","It does not contain reusable parts"}	It may contain hazardous materials	1
QQ0032	QZ003	QQ0032	What should you do with loose lithium batteries before disposal when required?	{"Tape the terminals","Throw them into general waste","Crush them first","Soak them in water"}	Tape the terminals	1
QQ0033	QZ003	QQ0033	Which item belongs in an e-waste collection point?	{"Old charger","Clean cardboard","Banana peel","Glass jar"}	Old charger	1
QQ0034	QZ003	QQ0034	Why are certified e-waste partners important?	{"They handle electronics safely","They mix electronics with food waste","They remove the need for sorting","They only collect paper"}	They handle electronics safely	1
QQ0035	QZ003	QQ0035	Which habit supports safer campus e-waste recycling?	{"Use approved drop-off points","Place devices in normal bins","Ignore batteries","Break devices before handover"}	Use approved drop-off points	1
\.


--
-- TOC entry 4439 (class 0 OID 28251)
-- Dependencies: 235
-- Data for Name: RecyclingQrCode; Type: TABLE DATA; Schema: public; Owner: sdgadmin
--

COPY public."RecyclingQrCode" (id, nonce, signature, status, "expiresAt", "issuedById", "claimedById", "claimedAt", "invalidatedById", "invalidatedAt", "materialType", "estimatedWeightKg", payload, "createdAt", "updatedAt") FROM stdin;
QR001	ca40967e2462170cc6840f280f60a723	008c75bca17b24930bf0b29c0b078addbdd4a6644f7323313e0c319f9c8bc446	ISSUED	2026-09-05 09:44:42.689	USR001	\N	\N	\N	\N	Metal	1.5	{"qrId": "QR001", "type": "recycling-deposit", "nonce": "ca40967e2462170cc6840f280f60a723", "expiresAt": "2026-09-05T09:44:42.689Z", "materialType": "Metal", "estimatedWeightKg": 1.5}	2026-08-06 09:44:42.692	2026-08-06 09:44:42.692
QR002	e59bb311f33b0d61fa9c01d090482990	9923a9e0809839e96676d7c6e7f8caf7b2bedfc41f5211b11891c1771b80c34b	CLAIMED	2026-09-05 09:44:42.689	USR001	USR003	2026-08-06 09:44:42.714	\N	\N	Plastic	2.5	{"qrId": "QR002", "type": "recycling-deposit", "nonce": "e59bb311f33b0d61fa9c01d090482990", "expiresAt": "2026-09-05T09:44:42.689Z", "materialType": "Plastic", "estimatedWeightKg": 2.5}	2026-08-06 09:44:42.715	2026-08-06 09:44:42.715
\.


--
-- TOC entry 4440 (class 0 OID 28269)
-- Dependencies: 236
-- Data for Name: RecyclingSubmission; Type: TABLE DATA; Schema: public; Owner: sdgadmin
--

COPY public."RecyclingSubmission" (id, "userId", source, "qrCodeId", "materialType", quantity, "proofImageUrl", status, "pointsAwarded", "isDuplicateFlagged", "reviewNote", "reviewedById", "submittedAt", "reviewedAt") FROM stdin;
RCS001	USR002	MANUAL	\N	Paper	35	\N	APPROVED	700	f	\N	USR001	2026-08-06 09:44:42.73	2026-08-06 09:44:42.729
RCS002	USR003	QR	QR002	Plastic	2.5	\N	PENDING_REVIEW	0	f	\N	\N	2026-08-06 09:44:42.759	\N
RCS003	USR004	MANUAL	\N	Paper	2.6	\N	APPROVED	52	f	Approved after evidence review.	USR001	2026-08-06 09:53:52.597	2026-08-06 09:58:12.098
RCS004	USR002	MANUAL	\N	Plastic	5	https://stsdguploads.blob.core.windows.net/recycling-proofs/USR002/1786014471415-recycling-proof-1786014468406jpg	APPROVED	250	f	\N	\N	2026-08-06 11:07:51.936	2026-08-06 19:15:00.328
RCS005	USR002	MANUAL	\N	Glass	1	https://stsdguploads.blob.core.windows.net/recycling-proofs/USR002/1786015389213-recycling-proof-1786015386546jpg	APPROVED	30	f	\N	\N	2026-08-06 11:23:09.746	2026-08-06 19:24:38.719
RCS_TEST_PAPER_26	USR003	MANUAL	\N	Paper	2.6	\N	APPROVED	52	f	\N	\N	2026-08-06 09:50:45.115	2026-08-06 09:50:45.115
\.


--
-- TOC entry 4443 (class 0 OID 28317)
-- Dependencies: 239
-- Data for Name: Redemption; Type: TABLE DATA; Schema: public; Owner: sdgadmin
--

COPY public."Redemption" (id, "userId", "rewardId", "itemName", quantity, "pointsSpent", status, "reservedAt", "expiresAt", "completedAt", "cancelledAt", "cancelReason", "createdAt") FROM stdin;
RDM001	USR002	RWD001	Reusable Coffee Cup Voucher	1	100	RESERVED	2026-08-06 09:44:42.769	2026-09-05 09:44:42.769	\N	\N	\N	2026-08-06 09:44:42.77
RDM002	USR002	RWD001	Reusable Coffee Cup Voucher	1	100	COMPLETED	2026-08-04 09:44:42.769	\N	2026-08-06 09:44:42.769	\N	\N	2026-08-06 09:44:42.783
\.


--
-- TOC entry 4444 (class 0 OID 28336)
-- Dependencies: 240
-- Data for Name: RedemptionCooldown; Type: TABLE DATA; Schema: public; Owner: sdgadmin
--

COPY public."RedemptionCooldown" (id, "userId", "rewardId", "lastRedeemedAt", "countToday", "countWeek") FROM stdin;
\.


--
-- TOC entry 4442 (class 0 OID 28299)
-- Dependencies: 238
-- Data for Name: Reward; Type: TABLE DATA; Schema: public; Owner: sdgadmin
--

COPY public."Reward" (id, name, "pointsRequired", stock, "imageUrl", "imageUploadId", category, "expiresAt", "isActive", tier, "createdAt") FROM stdin;
RWD001	Reusable Coffee Cup Voucher	100	30	https://commons.wikimedia.org/wiki/Special:FilePath/Reusable%20coffee%20cup.jpg	\N	Lifestyle	\N	t	small	2026-08-06 09:44:42.517
RWD002	Campus Cafe RM5 Voucher	300	20	https://commons.wikimedia.org/wiki/Special:FilePath/Cafeteria%20meal.jpg	\N	Food	\N	t	medium	2026-08-06 09:44:42.527
RWD003	Eco Starter Kit	600	10	https://commons.wikimedia.org/wiki/Special:FilePath/Recycling%20bins.jpg	\N	Eco Gear	\N	t	large	2026-08-06 09:44:42.531
\.


--
-- TOC entry 4441 (class 0 OID 28290)
-- Dependencies: 237
-- Data for Name: RewardTier; Type: TABLE DATA; Schema: public; Owner: sdgadmin
--

COPY public."RewardTier" (tier, "pointsRequired") FROM stdin;
small	100
medium	300
large	600
\.


--
-- TOC entry 4445 (class 0 OID 28350)
-- Dependencies: 241
-- Data for Name: SuspiciousActivityLog; Type: TABLE DATA; Schema: public; Owner: sdgadmin
--

COPY public."SuspiciousActivityLog" (id, "userId", "activityType", severity, details, "detectedAt") FROM stdin;
\.


--
-- TOC entry 4436 (class 0 OID 28046)
-- Dependencies: 232
-- Data for Name: UploadedFile; Type: TABLE DATA; Schema: public; Owner: sdgadmin
--

COPY public."UploadedFile" (id, "userId", "missionSubmissionId", "containerName", "blobName", "fileUrl", "mimeType", "fileSize", purpose, "createdAt", "recyclingSubmissionId", "rewardId") FROM stdin;
UPL001	USR002	\N	recycling-proofs	USR002/1786014471415-recycling-proof-1786014468406jpg	https://stsdguploads.blob.core.windows.net/recycling-proofs/USR002/1786014471415-recycling-proof-1786014468406jpg	image/jpeg	2792692	RECYCLING_PROOF	2026-08-06 11:07:51.581	RCS004	\N
UPL002	USR002	\N	recycling-proofs	USR002/1786015389213-recycling-proof-1786015386546jpg	https://stsdguploads.blob.core.windows.net/recycling-proofs/USR002/1786015389213-recycling-proof-1786015386546jpg	image/jpeg	12370	RECYCLING_PROOF	2026-08-06 11:23:09.313	RCS005	\N
UPL003	USR002	SUB004	mission-proofs	USR002/1786015518002-mission-proofjpg	https://stsdguploads.blob.core.windows.net/mission-proofs/USR002/1786015518002-mission-proofjpg	image/jpeg	11385	MISSION_PROOF	2026-08-06 11:25:18.031	\N	\N
UPL004	USR002	\N	recycling-proofs	USR002/1786016113810-recycling-proof-1786016111073jpg	https://stsdguploads.blob.core.windows.net/recycling-proofs/USR002/1786016113810-recycling-proof-1786016111073jpg	image/jpeg	2792692	RECYCLING_PROOF	2026-08-06 11:35:14.057	\N	\N
\.


--
-- TOC entry 4424 (class 0 OID 27839)
-- Dependencies: 220
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: sdgadmin
--

COPY public."User" (id, name, email, "passwordHash", role, "createdAt", "updatedAt", "lastRecyclingSubmissionAt", "suspiciousActivityFlagged", "isActive", "deactivatedAt", "deactivationReason") FROM stdin;
USR001	Admin User	admin@uow.edu.my	$2b$10$tAWWPJyahFWu7w.E2YhZ6e/5WEBGakIVl.k8Laupq.D9wuESDUxq6	ADMIN	2026-08-06 09:44:42.161	2026-08-06 09:44:42.161	\N	f	t	\N	\N
USR003	Student Two	student2@student.uow.edu.my	$2b$10$tAWWPJyahFWu7w.E2YhZ6e/5WEBGakIVl.k8Laupq.D9wuESDUxq6	STUDENT	2026-08-06 09:44:42.182	2026-08-06 09:44:42.182	\N	f	t	\N	\N
USR004	Student Three	student3@student.uow.edu.my	$2b$10$tAWWPJyahFWu7w.E2YhZ6e/5WEBGakIVl.k8Laupq.D9wuESDUxq6	STUDENT	2026-08-06 09:44:42.186	2026-08-06 09:53:52.698	2026-08-06 09:53:52.597	f	t	\N	\N
USR005	Janusha Suma A/P V Vasanthan	M44100198@student.uow.edu.my	$2b$10$Gy2aWOLyPj86wz4I1bDi6.yvwhN3KRGtwscCXs8YZwTTq9QE43NGi	STUDENT	2026-08-06 10:29:12.497	2026-08-06 10:29:12.497	\N	f	t	\N	\N
USR006	Wang Sidi	M44100050@student.uow.edu.my	$2b$10$cswj1bKMDjCtccb8k.OD1.4uxGLQS85z1JRw5VjAukE4wIPLplIdG	STUDENT	2026-08-06 10:59:12.445	2026-08-06 10:59:12.445	\N	f	t	\N	\N
USR007	Vickramraaj Chan Gurusamy	m44100477@student.uow.edu.my	$2b$10$3cUg2lXYq1biR5yN7vTtj.Z3k6Qc/oqCXcZLEgFws/hy5cSt2BW/y	STUDENT	2026-08-06 11:00:10.798	2026-08-06 11:00:10.798	\N	f	t	\N	\N
USR002	Student One	student1@student.uow.edu.my	$2b$10$tAWWPJyahFWu7w.E2YhZ6e/5WEBGakIVl.k8Laupq.D9wuESDUxq6	STUDENT	2026-08-06 09:44:42.176	2026-08-06 11:23:09.777	2026-08-06 11:23:09.746	f	t	\N	\N
\.


--
-- TOC entry 4423 (class 0 OID 27754)
-- Dependencies: 219
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: sdgadmin
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
7b68516e-a843-441b-a705-9862b8d6d232	8b094f3d8140a3f41d706addb8514577ffe9191325ebb17a8a4880e18b6648a9	2026-08-06 09:44:34.975012+00	20260730090000_add_mission_completed_points_event_type	\N	\N	2026-08-06 09:44:34.882964+00	1
fad96a10-6747-4f56-839d-ee1ecd00cf81	8f214dafde2ca104dd2e66e7f9df8b2634ed999dcf93d6b61f61ac6a351eadb9	2026-08-06 09:44:32.770593+00	20260702_initial_engagement_engine	\N	\N	2026-08-06 09:44:31.977645+00	1
4e428857-9b37-432e-a2e3-a6a49a9065a4	a6cfcc900a7a6d02ee57aa5758035b1009ca5dc69758e8975fff5ef07ae877b7	2026-08-06 09:44:32.979647+00	20260724063030_add_mission_details_fields	\N	\N	2026-08-06 09:44:32.822218+00	1
078126f2-e459-42bb-bf3a-565bdddee84f	0a6711317d067ce0d0cc8048cabc8b4a7edec03005628ad89ac5efa8a9ad23ae	2026-08-06 09:44:33.166183+00	20260726000000_add_mission_progress_targets	\N	\N	2026-08-06 09:44:33.026822+00	1
4c7e2bdd-1eda-4c44-9b4c-52689bf33088	fd1323488318c0c0ade4ff5067ddf6f3f7ff726b6e8b68d02ebfd49a0922e660	2026-08-06 09:44:35.072498+00	20260730100000_add_mission_completed_unique_index	\N	\N	2026-08-06 09:44:34.981309+00	1
2d879534-bb69-4aad-afac-251a2030979d	e219075206228701cabca8b703302062b3e2e28a23d004797350b1d8109593ab	2026-08-06 09:44:33.372065+00	20260726010000_add_ongoing_submission_status	\N	\N	2026-08-06 09:44:33.220428+00	1
6509b8bd-a451-4737-b21c-b7722cadc340	e3278333bdc6ee5b3e51875fed85b61365de87ad11a3829ab49b027345ef929d	2026-08-06 09:44:33.580143+00	20260728000000_add_content_detail_fields	\N	\N	2026-08-06 09:44:33.421841+00	1
3909bdc5-c9a3-46b5-ac3f-4b6a6329005e	c150775f6df0c57d437f034173fb130e9ecbb75fe3ad2973629d72d47210f9cf	2026-08-06 09:44:33.768235+00	20260728010000_remove_content_category	\N	\N	2026-08-06 09:44:33.628303+00	1
660c3363-88a3-4037-a745-1aa1468ae8e7	b2e0fcbb3b96c8c8bd82d31f7735370eb618a05dabf69f05b23025d2685b2dfe	2026-08-06 09:44:35.166218+00	20260730110000_add_mission_completion_points_trigger	\N	\N	2026-08-06 09:44:35.078996+00	1
a249fb44-a8b4-4c08-bcc8-b9a88ab530ba	421330fb3ae2b0a50126344a6ee266f93c78499159ac328c02a6e6c18f430a6b	2026-08-06 09:44:33.975103+00	20260728020000_add_learning_progress_best_score	\N	\N	2026-08-06 09:44:33.837237+00	1
2e54e5ad-ddec-4af4-8d0e-097bcc83c364	f84896a6512c7cba2956bd018631f857501268224fb5ad48dc4d2871ee8499af	2026-08-06 09:44:34.116361+00	20260728030000_add_quiz_attempt_time_spent	\N	\N	2026-08-06 09:44:33.986506+00	1
d9ce18d8-d8c3-4a67-a44e-2879c55fcad2	9e47db8d5ba669bd329405838c18e51bafe0329fb46debe0fa588babd2539693	2026-08-06 09:44:34.326173+00	20260728040000_use_question_count_quiz_scores	\N	\N	2026-08-06 09:44:34.184204+00	1
951643f0-2440-4089-895e-cee98b506642	ab446a5d9c65bead47b460cd88fd9dc1ed0c36e0c5d7d5068e51f1dd42b90776	2026-08-06 09:44:35.326751+00	20260803065023_add_recycling_rewards_anti_gaming_leaderboard	\N	\N	2026-08-06 09:44:35.173345+00	1
a44727ec-68bf-4e3e-93ca-733cc0c02e55	cbbde390148489e38354606dc9ec5dd405a2cfe32741170b8c5df8577c0c712f	2026-08-06 09:44:34.529529+00	20260728050000_add_content_image_upload_purpose	\N	\N	2026-08-06 09:44:34.372894+00	1
e5856d6f-113c-4ff2-b61e-e65742632db6	161f9cb706aaaef1b258b403f519e7ae3cfe1a54d4b1e54b02cb18b2222bb765	2026-08-06 09:44:34.719197+00	20260728060000_add_mission_image_upload_purpose	\N	\N	2026-08-06 09:44:34.573168+00	1
e2192db8-2dbc-4da4-9bd6-4d8405f9d5cf	22b02e911ec81e32163e5e7e159b0fd8d79673c185b6a2ed195e4f232016ff2f	2026-08-06 09:44:34.836766+00	20260729021000_add_approved_submissions_badge_criteria	\N	\N	2026-08-06 09:44:34.726838+00	1
76f35526-3d76-404a-8324-6c0f8d069520	03f3d024154e46b8c66b8469f3df77d958e926dea5b3a8ce2107a9a990803162	2026-08-06 09:44:35.35296+00	20260803065336_add_points_event_idempotency_indexes	\N	\N	2026-08-06 09:44:35.338114+00	1
de843547-ac97-4a4d-962d-9f39de9d3dfe	2d5c700017caf0a39b32ff27343d7c982e62f4d0c6e23ee52fb818259aaf2d6f	2026-08-06 09:44:35.398462+00	20260805120000_add_user_deactivation_and_admin_notifications	\N	\N	2026-08-06 09:44:35.367174+00	1
b17e684a-e6f3-4d12-9e0e-8d072312704d	8707f96ec4c4a5ac5c56fa2a4edb1966dab62bd1bd2e3ee0d15d98a44987d263	2026-08-06 09:44:35.428391+00	20260806140000_add_direct_db_approval_points_triggers	\N	\N	2026-08-06 09:44:35.412125+00	1
ecc8ac95-a31f-4687-9f80-dbbbf933d81f	86c42a38351cbe25075707e7543808d4650914d6eae9e3243c9bbbb4117b5986	2026-08-06 09:44:35.450903+00	20260806153000_fix_recycling_approval_trigger_points	\N	\N	2026-08-06 09:44:35.435474+00	1
\.


--
-- TOC entry 4529 (class 0 OID 0)
-- Dependencies: 233
-- Name: PointsEvent_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sdgadmin
--

SELECT pg_catalog.setval('public."PointsEvent_id_seq"', 9, true);


--
-- TOC entry 4235 (class 2606 OID 28485)
-- Name: AdminNotification AdminNotification_pkey; Type: CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."AdminNotification"
    ADD CONSTRAINT "AdminNotification_pkey" PRIMARY KEY (id);


--
-- TOC entry 4188 (class 2606 OID 28022)
-- Name: BadgeAward BadgeAward_pkey; Type: CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."BadgeAward"
    ADD CONSTRAINT "BadgeAward_pkey" PRIMARY KEY (id);


--
-- TOC entry 4185 (class 2606 OID 28010)
-- Name: Badge Badge_pkey; Type: CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."Badge"
    ADD CONSTRAINT "Badge_pkey" PRIMARY KEY (id);


--
-- TOC entry 4174 (class 2606 OID 27944)
-- Name: ContentRevision ContentRevision_pkey; Type: CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."ContentRevision"
    ADD CONSTRAINT "ContentRevision_pkey" PRIMARY KEY (id);


--
-- TOC entry 4170 (class 2606 OID 27929)
-- Name: Content Content_pkey; Type: CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."Content"
    ADD CONSTRAINT "Content_pkey" PRIMARY KEY (id);


--
-- TOC entry 4192 (class 2606 OID 28045)
-- Name: LearningProgress LearningProgress_pkey; Type: CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."LearningProgress"
    ADD CONSTRAINT "LearningProgress_pkey" PRIMARY KEY (id);


--
-- TOC entry 4158 (class 2606 OID 27893)
-- Name: MissionSubmission MissionSubmission_pkey; Type: CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."MissionSubmission"
    ADD CONSTRAINT "MissionSubmission_pkey" PRIMARY KEY (id);


--
-- TOC entry 4153 (class 2606 OID 27879)
-- Name: Mission Mission_pkey; Type: CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."Mission"
    ADD CONSTRAINT "Mission_pkey" PRIMARY KEY (id);


--
-- TOC entry 4200 (class 2606 OID 28250)
-- Name: PointRate PointRate_pkey; Type: CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."PointRate"
    ADD CONSTRAINT "PointRate_pkey" PRIMARY KEY (material);


--
-- TOC entry 4162 (class 2606 OID 27910)
-- Name: PointsEvent PointsEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."PointsEvent"
    ADD CONSTRAINT "PointsEvent_pkey" PRIMARY KEY (id);


--
-- TOC entry 4182 (class 2606 OID 27991)
-- Name: QuizAttempt QuizAttempt_pkey; Type: CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."QuizAttempt"
    ADD CONSTRAINT "QuizAttempt_pkey" PRIMARY KEY (id);


--
-- TOC entry 4180 (class 2606 OID 27974)
-- Name: QuizQuestion QuizQuestion_pkey; Type: CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."QuizQuestion"
    ADD CONSTRAINT "QuizQuestion_pkey" PRIMARY KEY (id);


--
-- TOC entry 4176 (class 2606 OID 27960)
-- Name: Quiz Quiz_pkey; Type: CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."Quiz"
    ADD CONSTRAINT "Quiz_pkey" PRIMARY KEY (id);


--
-- TOC entry 4205 (class 2606 OID 28268)
-- Name: RecyclingQrCode RecyclingQrCode_pkey; Type: CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."RecyclingQrCode"
    ADD CONSTRAINT "RecyclingQrCode_pkey" PRIMARY KEY (id);


--
-- TOC entry 4209 (class 2606 OID 28289)
-- Name: RecyclingSubmission RecyclingSubmission_pkey; Type: CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."RecyclingSubmission"
    ADD CONSTRAINT "RecyclingSubmission_pkey" PRIMARY KEY (id);


--
-- TOC entry 4227 (class 2606 OID 28349)
-- Name: RedemptionCooldown RedemptionCooldown_pkey; Type: CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."RedemptionCooldown"
    ADD CONSTRAINT "RedemptionCooldown_pkey" PRIMARY KEY (id);


--
-- TOC entry 4222 (class 2606 OID 28335)
-- Name: Redemption Redemption_pkey; Type: CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."Redemption"
    ADD CONSTRAINT "Redemption_pkey" PRIMARY KEY (id);


--
-- TOC entry 4215 (class 2606 OID 28298)
-- Name: RewardTier RewardTier_pkey; Type: CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."RewardTier"
    ADD CONSTRAINT "RewardTier_pkey" PRIMARY KEY (tier);


--
-- TOC entry 4220 (class 2606 OID 28316)
-- Name: Reward Reward_pkey; Type: CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."Reward"
    ADD CONSTRAINT "Reward_pkey" PRIMARY KEY (id);


--
-- TOC entry 4230 (class 2606 OID 28363)
-- Name: SuspiciousActivityLog SuspiciousActivityLog_pkey; Type: CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."SuspiciousActivityLog"
    ADD CONSTRAINT "SuspiciousActivityLog_pkey" PRIMARY KEY (id);


--
-- TOC entry 4196 (class 2606 OID 28062)
-- Name: UploadedFile UploadedFile_pkey; Type: CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."UploadedFile"
    ADD CONSTRAINT "UploadedFile_pkey" PRIMARY KEY (id);


--
-- TOC entry 4150 (class 2606 OID 27854)
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- TOC entry 4147 (class 2606 OID 27767)
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- TOC entry 4233 (class 1259 OID 28486)
-- Name: AdminNotification_isRead_createdAt_idx; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE INDEX "AdminNotification_isRead_createdAt_idx" ON public."AdminNotification" USING btree ("isRead", "createdAt");


--
-- TOC entry 4236 (class 1259 OID 28487)
-- Name: AdminNotification_targetUserId_idx; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE INDEX "AdminNotification_targetUserId_idx" ON public."AdminNotification" USING btree ("targetUserId");


--
-- TOC entry 4189 (class 1259 OID 28077)
-- Name: BadgeAward_userId_awardedAt_idx; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE INDEX "BadgeAward_userId_awardedAt_idx" ON public."BadgeAward" USING btree ("userId", "awardedAt");


--
-- TOC entry 4190 (class 1259 OID 28078)
-- Name: BadgeAward_userId_badgeId_key; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE UNIQUE INDEX "BadgeAward_userId_badgeId_key" ON public."BadgeAward" USING btree ("userId", "badgeId");


--
-- TOC entry 4186 (class 1259 OID 28076)
-- Name: Badge_slug_key; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE UNIQUE INDEX "Badge_slug_key" ON public."Badge" USING btree (slug);


--
-- TOC entry 4172 (class 1259 OID 28072)
-- Name: ContentRevision_contentId_version_idx; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE INDEX "ContentRevision_contentId_version_idx" ON public."ContentRevision" USING btree ("contentId", version);


--
-- TOC entry 4171 (class 1259 OID 28071)
-- Name: Content_slug_key; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE UNIQUE INDEX "Content_slug_key" ON public."Content" USING btree (slug);


--
-- TOC entry 4193 (class 1259 OID 28080)
-- Name: LearningProgress_userId_contentId_key; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE UNIQUE INDEX "LearningProgress_userId_contentId_key" ON public."LearningProgress" USING btree ("userId", "contentId");


--
-- TOC entry 4194 (class 1259 OID 28079)
-- Name: LearningProgress_userId_lastActivityAt_idx; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE INDEX "LearningProgress_userId_lastActivityAt_idx" ON public."LearningProgress" USING btree ("userId", "lastActivityAt");


--
-- TOC entry 4156 (class 1259 OID 28067)
-- Name: MissionSubmission_missionId_userId_submittedAt_idx; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE INDEX "MissionSubmission_missionId_userId_submittedAt_idx" ON public."MissionSubmission" USING btree ("missionId", "userId", "submittedAt");


--
-- TOC entry 4159 (class 1259 OID 28068)
-- Name: MissionSubmission_status_submittedAt_idx; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE INDEX "MissionSubmission_status_submittedAt_idx" ON public."MissionSubmission" USING btree (status, "submittedAt");


--
-- TOC entry 4151 (class 1259 OID 28066)
-- Name: Mission_isActive_idx; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE INDEX "Mission_isActive_idx" ON public."Mission" USING btree ("isActive");


--
-- TOC entry 4154 (class 1259 OID 28064)
-- Name: Mission_slug_key; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE UNIQUE INDEX "Mission_slug_key" ON public."Mission" USING btree (slug);


--
-- TOC entry 4155 (class 1259 OID 28065)
-- Name: Mission_status_startAt_endAt_idx; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE INDEX "Mission_status_startAt_endAt_idx" ON public."Mission" USING btree (status, "startAt", "endAt");


--
-- TOC entry 4160 (class 1259 OID 28189)
-- Name: PointsEvent_mission_completed_user_mission_key; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE UNIQUE INDEX "PointsEvent_mission_completed_user_mission_key" ON public."PointsEvent" USING btree ("userId", "missionId", "eventType") WHERE (("eventType" = 'MISSION_COMPLETED'::public."PointsEventType") AND ("missionId" IS NOT NULL));


--
-- TOC entry 4163 (class 1259 OID 28466)
-- Name: PointsEvent_recycling_approved_submission_key; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE UNIQUE INDEX "PointsEvent_recycling_approved_submission_key" ON public."PointsEvent" USING btree ("recyclingSubmissionId") WHERE (("eventType" = 'RECYCLING_APPROVED'::public."PointsEventType") AND ("recyclingSubmissionId" IS NOT NULL));


--
-- TOC entry 4164 (class 1259 OID 28467)
-- Name: PointsEvent_reward_redeemed_redemption_key; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE UNIQUE INDEX "PointsEvent_reward_redeemed_redemption_key" ON public."PointsEvent" USING btree ("redemptionId") WHERE (("eventType" = 'REWARD_REDEEMED'::public."PointsEventType") AND ("redemptionId" IS NOT NULL));


--
-- TOC entry 4165 (class 1259 OID 28468)
-- Name: PointsEvent_reward_refunded_redemption_key; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE UNIQUE INDEX "PointsEvent_reward_refunded_redemption_key" ON public."PointsEvent" USING btree ("redemptionId") WHERE (("eventType" = 'REWARD_REFUNDED'::public."PointsEventType") AND ("redemptionId" IS NOT NULL));


--
-- TOC entry 4166 (class 1259 OID 28070)
-- Name: PointsEvent_status_createdAt_idx; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE INDEX "PointsEvent_status_createdAt_idx" ON public."PointsEvent" USING btree (status, "createdAt");


--
-- TOC entry 4167 (class 1259 OID 28383)
-- Name: PointsEvent_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE INDEX "PointsEvent_userId_createdAt_idx" ON public."PointsEvent" USING btree ("userId", "createdAt");


--
-- TOC entry 4168 (class 1259 OID 28382)
-- Name: PointsEvent_userId_eventType_idx; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE INDEX "PointsEvent_userId_eventType_idx" ON public."PointsEvent" USING btree ("userId", "eventType");


--
-- TOC entry 4183 (class 1259 OID 28075)
-- Name: QuizAttempt_userId_attemptedAt_idx; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE INDEX "QuizAttempt_userId_attemptedAt_idx" ON public."QuizAttempt" USING btree ("userId", "attemptedAt");


--
-- TOC entry 4178 (class 1259 OID 28074)
-- Name: QuizQuestion_code_key; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE UNIQUE INDEX "QuizQuestion_code_key" ON public."QuizQuestion" USING btree (code);


--
-- TOC entry 4177 (class 1259 OID 28073)
-- Name: Quiz_slug_key; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE UNIQUE INDEX "Quiz_slug_key" ON public."Quiz" USING btree (slug);


--
-- TOC entry 4201 (class 1259 OID 28367)
-- Name: RecyclingQrCode_claimedById_claimedAt_idx; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE INDEX "RecyclingQrCode_claimedById_claimedAt_idx" ON public."RecyclingQrCode" USING btree ("claimedById", "claimedAt");


--
-- TOC entry 4202 (class 1259 OID 28366)
-- Name: RecyclingQrCode_issuedById_createdAt_idx; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE INDEX "RecyclingQrCode_issuedById_createdAt_idx" ON public."RecyclingQrCode" USING btree ("issuedById", "createdAt");


--
-- TOC entry 4203 (class 1259 OID 28364)
-- Name: RecyclingQrCode_nonce_key; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE UNIQUE INDEX "RecyclingQrCode_nonce_key" ON public."RecyclingQrCode" USING btree (nonce);


--
-- TOC entry 4206 (class 1259 OID 28365)
-- Name: RecyclingQrCode_status_expiresAt_idx; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE INDEX "RecyclingQrCode_status_expiresAt_idx" ON public."RecyclingQrCode" USING btree (status, "expiresAt");


--
-- TOC entry 4207 (class 1259 OID 28371)
-- Name: RecyclingSubmission_materialType_idx; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE INDEX "RecyclingSubmission_materialType_idx" ON public."RecyclingSubmission" USING btree ("materialType");


--
-- TOC entry 4210 (class 1259 OID 28368)
-- Name: RecyclingSubmission_qrCodeId_key; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE UNIQUE INDEX "RecyclingSubmission_qrCodeId_key" ON public."RecyclingSubmission" USING btree ("qrCodeId");


--
-- TOC entry 4211 (class 1259 OID 28372)
-- Name: RecyclingSubmission_source_submittedAt_idx; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE INDEX "RecyclingSubmission_source_submittedAt_idx" ON public."RecyclingSubmission" USING btree (source, "submittedAt");


--
-- TOC entry 4212 (class 1259 OID 28370)
-- Name: RecyclingSubmission_status_submittedAt_idx; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE INDEX "RecyclingSubmission_status_submittedAt_idx" ON public."RecyclingSubmission" USING btree (status, "submittedAt");


--
-- TOC entry 4213 (class 1259 OID 28369)
-- Name: RecyclingSubmission_userId_submittedAt_idx; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE INDEX "RecyclingSubmission_userId_submittedAt_idx" ON public."RecyclingSubmission" USING btree ("userId", "submittedAt");


--
-- TOC entry 4228 (class 1259 OID 28379)
-- Name: RedemptionCooldown_userId_rewardId_key; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE UNIQUE INDEX "RedemptionCooldown_userId_rewardId_key" ON public."RedemptionCooldown" USING btree ("userId", "rewardId");


--
-- TOC entry 4223 (class 1259 OID 28377)
-- Name: Redemption_rewardId_idx; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE INDEX "Redemption_rewardId_idx" ON public."Redemption" USING btree ("rewardId");


--
-- TOC entry 4224 (class 1259 OID 28378)
-- Name: Redemption_status_idx; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE INDEX "Redemption_status_idx" ON public."Redemption" USING btree (status);


--
-- TOC entry 4225 (class 1259 OID 28376)
-- Name: Redemption_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE INDEX "Redemption_userId_createdAt_idx" ON public."Redemption" USING btree ("userId", "createdAt");


--
-- TOC entry 4216 (class 1259 OID 28373)
-- Name: Reward_imageUploadId_key; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE UNIQUE INDEX "Reward_imageUploadId_key" ON public."Reward" USING btree ("imageUploadId");


--
-- TOC entry 4217 (class 1259 OID 28375)
-- Name: Reward_isActive_pointsRequired_idx; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE INDEX "Reward_isActive_pointsRequired_idx" ON public."Reward" USING btree ("isActive", "pointsRequired");


--
-- TOC entry 4218 (class 1259 OID 28374)
-- Name: Reward_isActive_tier_idx; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE INDEX "Reward_isActive_tier_idx" ON public."Reward" USING btree ("isActive", tier);


--
-- TOC entry 4231 (class 1259 OID 28381)
-- Name: SuspiciousActivityLog_severity_detectedAt_idx; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE INDEX "SuspiciousActivityLog_severity_detectedAt_idx" ON public."SuspiciousActivityLog" USING btree (severity, "detectedAt");


--
-- TOC entry 4232 (class 1259 OID 28380)
-- Name: SuspiciousActivityLog_userId_detectedAt_idx; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE INDEX "SuspiciousActivityLog_userId_detectedAt_idx" ON public."SuspiciousActivityLog" USING btree ("userId", "detectedAt");


--
-- TOC entry 4197 (class 1259 OID 28384)
-- Name: UploadedFile_recyclingSubmissionId_idx; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE INDEX "UploadedFile_recyclingSubmissionId_idx" ON public."UploadedFile" USING btree ("recyclingSubmissionId");


--
-- TOC entry 4198 (class 1259 OID 28385)
-- Name: UploadedFile_rewardId_idx; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE INDEX "UploadedFile_rewardId_idx" ON public."UploadedFile" USING btree ("rewardId");


--
-- TOC entry 4148 (class 1259 OID 28063)
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- TOC entry 4273 (class 2620 OID 28493)
-- Name: MissionSubmission mission_completion_points_event_trigger; Type: TRIGGER; Schema: public; Owner: sdgadmin
--

CREATE TRIGGER mission_completion_points_event_trigger AFTER INSERT OR UPDATE OF status, quantity, "reviewedAt" ON public."MissionSubmission" FOR EACH ROW EXECUTE FUNCTION public.create_mission_completion_points_event();


--
-- TOC entry 4274 (class 2620 OID 28497)
-- Name: RecyclingSubmission prepare_recycling_approval_points_trigger; Type: TRIGGER; Schema: public; Owner: sdgadmin
--

CREATE TRIGGER prepare_recycling_approval_points_trigger BEFORE INSERT OR UPDATE OF status, "pointsAwarded", "reviewedAt" ON public."RecyclingSubmission" FOR EACH ROW EXECUTE FUNCTION public.prepare_recycling_approval_points();


--
-- TOC entry 4275 (class 2620 OID 28498)
-- Name: RecyclingSubmission recycling_approval_points_event_trigger; Type: TRIGGER; Schema: public; Owner: sdgadmin
--

CREATE TRIGGER recycling_approval_points_event_trigger AFTER INSERT OR UPDATE OF status, "pointsAwarded", "reviewedAt" ON public."RecyclingSubmission" FOR EACH ROW EXECUTE FUNCTION public.create_recycling_approval_points_event();


--
-- TOC entry 4272 (class 2606 OID 28488)
-- Name: AdminNotification AdminNotification_targetUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."AdminNotification"
    ADD CONSTRAINT "AdminNotification_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 4252 (class 2606 OID 28151)
-- Name: BadgeAward BadgeAward_badgeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."BadgeAward"
    ADD CONSTRAINT "BadgeAward_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES public."Badge"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 4253 (class 2606 OID 28146)
-- Name: BadgeAward BadgeAward_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."BadgeAward"
    ADD CONSTRAINT "BadgeAward_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 4247 (class 2606 OID 28121)
-- Name: ContentRevision ContentRevision_contentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."ContentRevision"
    ADD CONSTRAINT "ContentRevision_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES public."Content"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 4246 (class 2606 OID 28116)
-- Name: Content Content_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."Content"
    ADD CONSTRAINT "Content_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 4254 (class 2606 OID 28161)
-- Name: LearningProgress LearningProgress_contentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."LearningProgress"
    ADD CONSTRAINT "LearningProgress_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES public."Content"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 4255 (class 2606 OID 28156)
-- Name: LearningProgress LearningProgress_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."LearningProgress"
    ADD CONSTRAINT "LearningProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 4238 (class 2606 OID 28086)
-- Name: MissionSubmission MissionSubmission_missionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."MissionSubmission"
    ADD CONSTRAINT "MissionSubmission_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES public."Mission"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 4239 (class 2606 OID 28096)
-- Name: MissionSubmission MissionSubmission_reviewedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."MissionSubmission"
    ADD CONSTRAINT "MissionSubmission_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4240 (class 2606 OID 28091)
-- Name: MissionSubmission MissionSubmission_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."MissionSubmission"
    ADD CONSTRAINT "MissionSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 4237 (class 2606 OID 28081)
-- Name: Mission Mission_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."Mission"
    ADD CONSTRAINT "Mission_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 4241 (class 2606 OID 28106)
-- Name: PointsEvent PointsEvent_missionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."PointsEvent"
    ADD CONSTRAINT "PointsEvent_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES public."Mission"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4242 (class 2606 OID 28386)
-- Name: PointsEvent PointsEvent_recyclingSubmissionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."PointsEvent"
    ADD CONSTRAINT "PointsEvent_recyclingSubmissionId_fkey" FOREIGN KEY ("recyclingSubmissionId") REFERENCES public."RecyclingSubmission"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4243 (class 2606 OID 28391)
-- Name: PointsEvent PointsEvent_redemptionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."PointsEvent"
    ADD CONSTRAINT "PointsEvent_redemptionId_fkey" FOREIGN KEY ("redemptionId") REFERENCES public."Redemption"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4244 (class 2606 OID 28111)
-- Name: PointsEvent PointsEvent_submissionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."PointsEvent"
    ADD CONSTRAINT "PointsEvent_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES public."MissionSubmission"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4245 (class 2606 OID 28101)
-- Name: PointsEvent PointsEvent_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."PointsEvent"
    ADD CONSTRAINT "PointsEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 4250 (class 2606 OID 28136)
-- Name: QuizAttempt QuizAttempt_quizId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."QuizAttempt"
    ADD CONSTRAINT "QuizAttempt_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES public."Quiz"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 4251 (class 2606 OID 28141)
-- Name: QuizAttempt QuizAttempt_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."QuizAttempt"
    ADD CONSTRAINT "QuizAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 4249 (class 2606 OID 28131)
-- Name: QuizQuestion QuizQuestion_quizId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."QuizQuestion"
    ADD CONSTRAINT "QuizQuestion_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES public."Quiz"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 4248 (class 2606 OID 28126)
-- Name: Quiz Quiz_contentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."Quiz"
    ADD CONSTRAINT "Quiz_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES public."Content"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 4260 (class 2606 OID 28401)
-- Name: RecyclingQrCode RecyclingQrCode_claimedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."RecyclingQrCode"
    ADD CONSTRAINT "RecyclingQrCode_claimedById_fkey" FOREIGN KEY ("claimedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4261 (class 2606 OID 28406)
-- Name: RecyclingQrCode RecyclingQrCode_invalidatedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."RecyclingQrCode"
    ADD CONSTRAINT "RecyclingQrCode_invalidatedById_fkey" FOREIGN KEY ("invalidatedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4262 (class 2606 OID 28396)
-- Name: RecyclingQrCode RecyclingQrCode_issuedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."RecyclingQrCode"
    ADD CONSTRAINT "RecyclingQrCode_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 4263 (class 2606 OID 28421)
-- Name: RecyclingSubmission RecyclingSubmission_qrCodeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."RecyclingSubmission"
    ADD CONSTRAINT "RecyclingSubmission_qrCodeId_fkey" FOREIGN KEY ("qrCodeId") REFERENCES public."RecyclingQrCode"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4264 (class 2606 OID 28416)
-- Name: RecyclingSubmission RecyclingSubmission_reviewedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."RecyclingSubmission"
    ADD CONSTRAINT "RecyclingSubmission_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4265 (class 2606 OID 28411)
-- Name: RecyclingSubmission RecyclingSubmission_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."RecyclingSubmission"
    ADD CONSTRAINT "RecyclingSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 4269 (class 2606 OID 28446)
-- Name: RedemptionCooldown RedemptionCooldown_rewardId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."RedemptionCooldown"
    ADD CONSTRAINT "RedemptionCooldown_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES public."Reward"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 4270 (class 2606 OID 28441)
-- Name: RedemptionCooldown RedemptionCooldown_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."RedemptionCooldown"
    ADD CONSTRAINT "RedemptionCooldown_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 4267 (class 2606 OID 28436)
-- Name: Redemption Redemption_rewardId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."Redemption"
    ADD CONSTRAINT "Redemption_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES public."Reward"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4268 (class 2606 OID 28431)
-- Name: Redemption Redemption_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."Redemption"
    ADD CONSTRAINT "Redemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 4266 (class 2606 OID 28426)
-- Name: Reward Reward_imageUploadId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."Reward"
    ADD CONSTRAINT "Reward_imageUploadId_fkey" FOREIGN KEY ("imageUploadId") REFERENCES public."UploadedFile"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4271 (class 2606 OID 28451)
-- Name: SuspiciousActivityLog SuspiciousActivityLog_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."SuspiciousActivityLog"
    ADD CONSTRAINT "SuspiciousActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 4256 (class 2606 OID 28171)
-- Name: UploadedFile UploadedFile_missionSubmissionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."UploadedFile"
    ADD CONSTRAINT "UploadedFile_missionSubmissionId_fkey" FOREIGN KEY ("missionSubmissionId") REFERENCES public."MissionSubmission"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4257 (class 2606 OID 28456)
-- Name: UploadedFile UploadedFile_recyclingSubmissionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."UploadedFile"
    ADD CONSTRAINT "UploadedFile_recyclingSubmissionId_fkey" FOREIGN KEY ("recyclingSubmissionId") REFERENCES public."RecyclingSubmission"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4258 (class 2606 OID 28461)
-- Name: UploadedFile UploadedFile_rewardId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."UploadedFile"
    ADD CONSTRAINT "UploadedFile_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES public."Reward"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4259 (class 2606 OID 28166)
-- Name: UploadedFile UploadedFile_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."UploadedFile"
    ADD CONSTRAINT "UploadedFile_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 4453 (class 0 OID 0)
-- Dependencies: 5
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: sdgadmin
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- TOC entry 4454 (class 0 OID 0)
-- Dependencies: 254
-- Name: FUNCTION pg_replication_origin_advance(text, pg_lsn); Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT ALL ON FUNCTION pg_catalog.pg_replication_origin_advance(text, pg_lsn) TO azure_pg_admin;


--
-- TOC entry 4455 (class 0 OID 0)
-- Dependencies: 246
-- Name: FUNCTION pg_replication_origin_create(text); Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT ALL ON FUNCTION pg_catalog.pg_replication_origin_create(text) TO azure_pg_admin;


--
-- TOC entry 4456 (class 0 OID 0)
-- Dependencies: 247
-- Name: FUNCTION pg_replication_origin_drop(text); Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT ALL ON FUNCTION pg_catalog.pg_replication_origin_drop(text) TO azure_pg_admin;


--
-- TOC entry 4457 (class 0 OID 0)
-- Dependencies: 255
-- Name: FUNCTION pg_replication_origin_oid(text); Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT ALL ON FUNCTION pg_catalog.pg_replication_origin_oid(text) TO azure_pg_admin;


--
-- TOC entry 4458 (class 0 OID 0)
-- Dependencies: 248
-- Name: FUNCTION pg_replication_origin_progress(text, boolean); Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT ALL ON FUNCTION pg_catalog.pg_replication_origin_progress(text, boolean) TO azure_pg_admin;


--
-- TOC entry 4459 (class 0 OID 0)
-- Dependencies: 249
-- Name: FUNCTION pg_replication_origin_session_is_setup(); Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT ALL ON FUNCTION pg_catalog.pg_replication_origin_session_is_setup() TO azure_pg_admin;


--
-- TOC entry 4460 (class 0 OID 0)
-- Dependencies: 250
-- Name: FUNCTION pg_replication_origin_session_progress(boolean); Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT ALL ON FUNCTION pg_catalog.pg_replication_origin_session_progress(boolean) TO azure_pg_admin;


--
-- TOC entry 4461 (class 0 OID 0)
-- Dependencies: 251
-- Name: FUNCTION pg_replication_origin_session_reset(); Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT ALL ON FUNCTION pg_catalog.pg_replication_origin_session_reset() TO azure_pg_admin;


--
-- TOC entry 4462 (class 0 OID 0)
-- Dependencies: 252
-- Name: FUNCTION pg_replication_origin_session_setup(text); Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT ALL ON FUNCTION pg_catalog.pg_replication_origin_session_setup(text) TO azure_pg_admin;


--
-- TOC entry 4463 (class 0 OID 0)
-- Dependencies: 256
-- Name: FUNCTION pg_replication_origin_xact_reset(); Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT ALL ON FUNCTION pg_catalog.pg_replication_origin_xact_reset() TO azure_pg_admin;


--
-- TOC entry 4464 (class 0 OID 0)
-- Dependencies: 253
-- Name: FUNCTION pg_replication_origin_xact_setup(pg_lsn, timestamp with time zone); Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT ALL ON FUNCTION pg_catalog.pg_replication_origin_xact_setup(pg_lsn, timestamp with time zone) TO azure_pg_admin;


--
-- TOC entry 4465 (class 0 OID 0)
-- Dependencies: 257
-- Name: FUNCTION pg_show_replication_origin_status(OUT local_id oid, OUT external_id text, OUT remote_lsn pg_lsn, OUT local_lsn pg_lsn); Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT ALL ON FUNCTION pg_catalog.pg_show_replication_origin_status(OUT local_id oid, OUT external_id text, OUT remote_lsn pg_lsn, OUT local_lsn pg_lsn) TO azure_pg_admin;


--
-- TOC entry 4466 (class 0 OID 0)
-- Dependencies: 243
-- Name: FUNCTION pg_stat_reset(); Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT ALL ON FUNCTION pg_catalog.pg_stat_reset() TO azure_pg_admin;


--
-- TOC entry 4467 (class 0 OID 0)
-- Dependencies: 258
-- Name: FUNCTION pg_stat_reset_shared(target text); Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT ALL ON FUNCTION pg_catalog.pg_stat_reset_shared(target text) TO azure_pg_admin;


--
-- TOC entry 4468 (class 0 OID 0)
-- Dependencies: 245
-- Name: FUNCTION pg_stat_reset_single_function_counters(oid); Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT ALL ON FUNCTION pg_catalog.pg_stat_reset_single_function_counters(oid) TO azure_pg_admin;


--
-- TOC entry 4469 (class 0 OID 0)
-- Dependencies: 244
-- Name: FUNCTION pg_stat_reset_single_table_counters(oid); Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT ALL ON FUNCTION pg_catalog.pg_stat_reset_single_table_counters(oid) TO azure_pg_admin;


--
-- TOC entry 4470 (class 0 OID 0)
-- Dependencies: 98
-- Name: COLUMN pg_config.name; Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT SELECT(name) ON TABLE pg_catalog.pg_config TO azure_pg_admin;


--
-- TOC entry 4471 (class 0 OID 0)
-- Dependencies: 98
-- Name: COLUMN pg_config.setting; Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT SELECT(setting) ON TABLE pg_catalog.pg_config TO azure_pg_admin;


--
-- TOC entry 4472 (class 0 OID 0)
-- Dependencies: 94
-- Name: COLUMN pg_hba_file_rules.line_number; Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT SELECT(line_number) ON TABLE pg_catalog.pg_hba_file_rules TO azure_pg_admin;


--
-- TOC entry 4473 (class 0 OID 0)
-- Dependencies: 94
-- Name: COLUMN pg_hba_file_rules.type; Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT SELECT(type) ON TABLE pg_catalog.pg_hba_file_rules TO azure_pg_admin;


--
-- TOC entry 4474 (class 0 OID 0)
-- Dependencies: 94
-- Name: COLUMN pg_hba_file_rules.database; Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT SELECT(database) ON TABLE pg_catalog.pg_hba_file_rules TO azure_pg_admin;


--
-- TOC entry 4475 (class 0 OID 0)
-- Dependencies: 94
-- Name: COLUMN pg_hba_file_rules.user_name; Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT SELECT(user_name) ON TABLE pg_catalog.pg_hba_file_rules TO azure_pg_admin;


--
-- TOC entry 4476 (class 0 OID 0)
-- Dependencies: 94
-- Name: COLUMN pg_hba_file_rules.address; Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT SELECT(address) ON TABLE pg_catalog.pg_hba_file_rules TO azure_pg_admin;


--
-- TOC entry 4477 (class 0 OID 0)
-- Dependencies: 94
-- Name: COLUMN pg_hba_file_rules.netmask; Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT SELECT(netmask) ON TABLE pg_catalog.pg_hba_file_rules TO azure_pg_admin;


--
-- TOC entry 4478 (class 0 OID 0)
-- Dependencies: 94
-- Name: COLUMN pg_hba_file_rules.auth_method; Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT SELECT(auth_method) ON TABLE pg_catalog.pg_hba_file_rules TO azure_pg_admin;


--
-- TOC entry 4479 (class 0 OID 0)
-- Dependencies: 94
-- Name: COLUMN pg_hba_file_rules.options; Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT SELECT(options) ON TABLE pg_catalog.pg_hba_file_rules TO azure_pg_admin;


--
-- TOC entry 4480 (class 0 OID 0)
-- Dependencies: 94
-- Name: COLUMN pg_hba_file_rules.error; Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT SELECT(error) ON TABLE pg_catalog.pg_hba_file_rules TO azure_pg_admin;


--
-- TOC entry 4481 (class 0 OID 0)
-- Dependencies: 146
-- Name: COLUMN pg_replication_origin_status.local_id; Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT SELECT(local_id) ON TABLE pg_catalog.pg_replication_origin_status TO azure_pg_admin;


--
-- TOC entry 4482 (class 0 OID 0)
-- Dependencies: 146
-- Name: COLUMN pg_replication_origin_status.external_id; Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT SELECT(external_id) ON TABLE pg_catalog.pg_replication_origin_status TO azure_pg_admin;


--
-- TOC entry 4483 (class 0 OID 0)
-- Dependencies: 146
-- Name: COLUMN pg_replication_origin_status.remote_lsn; Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT SELECT(remote_lsn) ON TABLE pg_catalog.pg_replication_origin_status TO azure_pg_admin;


--
-- TOC entry 4484 (class 0 OID 0)
-- Dependencies: 146
-- Name: COLUMN pg_replication_origin_status.local_lsn; Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT SELECT(local_lsn) ON TABLE pg_catalog.pg_replication_origin_status TO azure_pg_admin;


--
-- TOC entry 4485 (class 0 OID 0)
-- Dependencies: 99
-- Name: COLUMN pg_shmem_allocations.name; Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT SELECT(name) ON TABLE pg_catalog.pg_shmem_allocations TO azure_pg_admin;


--
-- TOC entry 4486 (class 0 OID 0)
-- Dependencies: 99
-- Name: COLUMN pg_shmem_allocations.off; Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT SELECT(off) ON TABLE pg_catalog.pg_shmem_allocations TO azure_pg_admin;


--
-- TOC entry 4487 (class 0 OID 0)
-- Dependencies: 99
-- Name: COLUMN pg_shmem_allocations.size; Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT SELECT(size) ON TABLE pg_catalog.pg_shmem_allocations TO azure_pg_admin;


--
-- TOC entry 4488 (class 0 OID 0)
-- Dependencies: 99
-- Name: COLUMN pg_shmem_allocations.allocated_size; Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT SELECT(allocated_size) ON TABLE pg_catalog.pg_shmem_allocations TO azure_pg_admin;


--
-- TOC entry 4489 (class 0 OID 0)
-- Dependencies: 39
-- Name: COLUMN pg_statistic.starelid; Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT SELECT(starelid) ON TABLE pg_catalog.pg_statistic TO azure_pg_admin;


--
-- TOC entry 4490 (class 0 OID 0)
-- Dependencies: 39
-- Name: COLUMN pg_statistic.staattnum; Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT SELECT(staattnum) ON TABLE pg_catalog.pg_statistic TO azure_pg_admin;


--
-- TOC entry 4491 (class 0 OID 0)
-- Dependencies: 39
-- Name: COLUMN pg_statistic.stainherit; Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT SELECT(stainherit) ON TABLE pg_catalog.pg_statistic TO azure_pg_admin;


--
-- TOC entry 4492 (class 0 OID 0)
-- Dependencies: 39
-- Name: COLUMN pg_statistic.stanullfrac; Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT SELECT(stanullfrac) ON TABLE pg_catalog.pg_statistic TO azure_pg_admin;


--
-- TOC entry 4493 (class 0 OID 0)
-- Dependencies: 39
-- Name: COLUMN pg_statistic.stawidth; Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT SELECT(stawidth) ON TABLE pg_catalog.pg_statistic TO azure_pg_admin;


--
-- TOC entry 4494 (class 0 OID 0)
-- Dependencies: 39
-- Name: COLUMN pg_statistic.stadistinct; Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT SELECT(stadistinct) ON TABLE pg_catalog.pg_statistic TO azure_pg_admin;


--
-- TOC entry 4495 (class 0 OID 0)
-- Dependencies: 39
-- Name: COLUMN pg_statistic.stakind1; Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT SELECT(stakind1) ON TABLE pg_catalog.pg_statistic TO azure_pg_admin;


--
-- TOC entry 4496 (class 0 OID 0)
-- Dependencies: 39
-- Name: COLUMN pg_statistic.stakind2; Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT SELECT(stakind2) ON TABLE pg_catalog.pg_statistic TO azure_pg_admin;


--
-- TOC entry 4497 (class 0 OID 0)
-- Dependencies: 39
-- Name: COLUMN pg_statistic.stakind3; Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT SELECT(stakind3) ON TABLE pg_catalog.pg_statistic TO azure_pg_admin;


--
-- TOC entry 4498 (class 0 OID 0)
-- Dependencies: 39
-- Name: COLUMN pg_statistic.stakind4; Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT SELECT(stakind4) ON TABLE pg_catalog.pg_statistic TO azure_pg_admin;


--
-- TOC entry 4499 (class 0 OID 0)
-- Dependencies: 39
-- Name: COLUMN pg_statistic.stakind5; Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT SELECT(stakind5) ON TABLE pg_catalog.pg_statistic TO azure_pg_admin;


--
-- TOC entry 4500 (class 0 OID 0)
-- Dependencies: 39
-- Name: COLUMN pg_statistic.staop1; Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT SELECT(staop1) ON TABLE pg_catalog.pg_statistic TO azure_pg_admin;


--
-- TOC entry 4501 (class 0 OID 0)
-- Dependencies: 39
-- Name: COLUMN pg_statistic.staop2; Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT SELECT(staop2) ON TABLE pg_catalog.pg_statistic TO azure_pg_admin;


--
-- TOC entry 4502 (class 0 OID 0)
-- Dependencies: 39
-- Name: COLUMN pg_statistic.staop3; Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT SELECT(staop3) ON TABLE pg_catalog.pg_statistic TO azure_pg_admin;


--
-- TOC entry 4503 (class 0 OID 0)
-- Dependencies: 39
-- Name: COLUMN pg_statistic.staop4; Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT SELECT(staop4) ON TABLE pg_catalog.pg_statistic TO azure_pg_admin;


--
-- TOC entry 4504 (class 0 OID 0)
-- Dependencies: 39
-- Name: COLUMN pg_statistic.staop5; Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT SELECT(staop5) ON TABLE pg_catalog.pg_statistic TO azure_pg_admin;


--
-- TOC entry 4505 (class 0 OID 0)
-- Dependencies: 39
-- Name: COLUMN pg_statistic.stacoll1; Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT SELECT(stacoll1) ON TABLE pg_catalog.pg_statistic TO azure_pg_admin;


--
-- TOC entry 4506 (class 0 OID 0)
-- Dependencies: 39
-- Name: COLUMN pg_statistic.stacoll2; Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT SELECT(stacoll2) ON TABLE pg_catalog.pg_statistic TO azure_pg_admin;


--
-- TOC entry 4507 (class 0 OID 0)
-- Dependencies: 39
-- Name: COLUMN pg_statistic.stacoll3; Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT SELECT(stacoll3) ON TABLE pg_catalog.pg_statistic TO azure_pg_admin;


--
-- TOC entry 4508 (class 0 OID 0)
-- Dependencies: 39
-- Name: COLUMN pg_statistic.stacoll4; Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT SELECT(stacoll4) ON TABLE pg_catalog.pg_statistic TO azure_pg_admin;


--
-- TOC entry 4509 (class 0 OID 0)
-- Dependencies: 39
-- Name: COLUMN pg_statistic.stacoll5; Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT SELECT(stacoll5) ON TABLE pg_catalog.pg_statistic TO azure_pg_admin;


--
-- TOC entry 4510 (class 0 OID 0)
-- Dependencies: 39
-- Name: COLUMN pg_statistic.stanumbers1; Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT SELECT(stanumbers1) ON TABLE pg_catalog.pg_statistic TO azure_pg_admin;


--
-- TOC entry 4511 (class 0 OID 0)
-- Dependencies: 39
-- Name: COLUMN pg_statistic.stanumbers2; Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT SELECT(stanumbers2) ON TABLE pg_catalog.pg_statistic TO azure_pg_admin;


--
-- TOC entry 4512 (class 0 OID 0)
-- Dependencies: 39
-- Name: COLUMN pg_statistic.stanumbers3; Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT SELECT(stanumbers3) ON TABLE pg_catalog.pg_statistic TO azure_pg_admin;


--
-- TOC entry 4513 (class 0 OID 0)
-- Dependencies: 39
-- Name: COLUMN pg_statistic.stanumbers4; Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT SELECT(stanumbers4) ON TABLE pg_catalog.pg_statistic TO azure_pg_admin;


--
-- TOC entry 4514 (class 0 OID 0)
-- Dependencies: 39
-- Name: COLUMN pg_statistic.stanumbers5; Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT SELECT(stanumbers5) ON TABLE pg_catalog.pg_statistic TO azure_pg_admin;


--
-- TOC entry 4515 (class 0 OID 0)
-- Dependencies: 39
-- Name: COLUMN pg_statistic.stavalues1; Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT SELECT(stavalues1) ON TABLE pg_catalog.pg_statistic TO azure_pg_admin;


--
-- TOC entry 4516 (class 0 OID 0)
-- Dependencies: 39
-- Name: COLUMN pg_statistic.stavalues2; Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT SELECT(stavalues2) ON TABLE pg_catalog.pg_statistic TO azure_pg_admin;


--
-- TOC entry 4517 (class 0 OID 0)
-- Dependencies: 39
-- Name: COLUMN pg_statistic.stavalues3; Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT SELECT(stavalues3) ON TABLE pg_catalog.pg_statistic TO azure_pg_admin;


--
-- TOC entry 4518 (class 0 OID 0)
-- Dependencies: 39
-- Name: COLUMN pg_statistic.stavalues4; Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT SELECT(stavalues4) ON TABLE pg_catalog.pg_statistic TO azure_pg_admin;


--
-- TOC entry 4519 (class 0 OID 0)
-- Dependencies: 39
-- Name: COLUMN pg_statistic.stavalues5; Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT SELECT(stavalues5) ON TABLE pg_catalog.pg_statistic TO azure_pg_admin;


--
-- TOC entry 4520 (class 0 OID 0)
-- Dependencies: 64
-- Name: COLUMN pg_subscription.oid; Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT SELECT(oid) ON TABLE pg_catalog.pg_subscription TO azure_pg_admin;


--
-- TOC entry 4521 (class 0 OID 0)
-- Dependencies: 64
-- Name: COLUMN pg_subscription.subdbid; Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT SELECT(subdbid) ON TABLE pg_catalog.pg_subscription TO azure_pg_admin;


--
-- TOC entry 4522 (class 0 OID 0)
-- Dependencies: 64
-- Name: COLUMN pg_subscription.subname; Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT SELECT(subname) ON TABLE pg_catalog.pg_subscription TO azure_pg_admin;


--
-- TOC entry 4523 (class 0 OID 0)
-- Dependencies: 64
-- Name: COLUMN pg_subscription.subowner; Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT SELECT(subowner) ON TABLE pg_catalog.pg_subscription TO azure_pg_admin;


--
-- TOC entry 4524 (class 0 OID 0)
-- Dependencies: 64
-- Name: COLUMN pg_subscription.subenabled; Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT SELECT(subenabled) ON TABLE pg_catalog.pg_subscription TO azure_pg_admin;


--
-- TOC entry 4525 (class 0 OID 0)
-- Dependencies: 64
-- Name: COLUMN pg_subscription.subconninfo; Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT SELECT(subconninfo) ON TABLE pg_catalog.pg_subscription TO azure_pg_admin;


--
-- TOC entry 4526 (class 0 OID 0)
-- Dependencies: 64
-- Name: COLUMN pg_subscription.subslotname; Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT SELECT(subslotname) ON TABLE pg_catalog.pg_subscription TO azure_pg_admin;


--
-- TOC entry 4527 (class 0 OID 0)
-- Dependencies: 64
-- Name: COLUMN pg_subscription.subsynccommit; Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT SELECT(subsynccommit) ON TABLE pg_catalog.pg_subscription TO azure_pg_admin;


--
-- TOC entry 4528 (class 0 OID 0)
-- Dependencies: 64
-- Name: COLUMN pg_subscription.subpublications; Type: ACL; Schema: pg_catalog; Owner: azuresu
--

GRANT SELECT(subpublications) ON TABLE pg_catalog.pg_subscription TO azure_pg_admin;


-- Completed on 2026-08-06 20:26:15

--
-- PostgreSQL database dump complete
--

\unrestrict EZWkILyH7jfx83gOiTaHZHAZ3PjgYhWVwo96wO2fewcKQG6tcCzB3TBJxlnLWaH

