--
-- PostgreSQL database dump
--

\restrict F9Vr3jVf3cxYyvVSVrlQBEhgKOzhtCy3NfAVmnuyMPf3dORCZA7p0GjTMmYM4SO

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

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
-- Name: public; Type: SCHEMA; Schema: -; Owner: sdgadmin
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO sdgadmin;

--
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
-- Name: BadgeTier; Type: TYPE; Schema: public; Owner: sdgadmin
--

CREATE TYPE public."BadgeTier" AS ENUM (
    'BRONZE',
    'SILVER',
    'GOLD'
);


ALTER TYPE public."BadgeTier" OWNER TO sdgadmin;

--
-- Name: ContentStatus; Type: TYPE; Schema: public; Owner: sdgadmin
--

CREATE TYPE public."ContentStatus" AS ENUM (
    'DRAFT',
    'PUBLISHED',
    'ARCHIVED'
);


ALTER TYPE public."ContentStatus" OWNER TO sdgadmin;

--
-- Name: MissionStatus; Type: TYPE; Schema: public; Owner: sdgadmin
--

CREATE TYPE public."MissionStatus" AS ENUM (
    'DRAFT',
    'ACTIVE',
    'ARCHIVED'
);


ALTER TYPE public."MissionStatus" OWNER TO sdgadmin;

--
-- Name: MissionType; Type: TYPE; Schema: public; Owner: sdgadmin
--

CREATE TYPE public."MissionType" AS ENUM (
    'QUANTITY_BASED',
    'STREAK_BASED',
    'TIME_LIMITED'
);


ALTER TYPE public."MissionType" OWNER TO sdgadmin;

--
-- Name: PointsEventStatus; Type: TYPE; Schema: public; Owner: sdgadmin
--

CREATE TYPE public."PointsEventStatus" AS ENUM (
    'PENDING',
    'SENT',
    'FAILED'
);


ALTER TYPE public."PointsEventStatus" OWNER TO sdgadmin;

--
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
-- Name: RecyclingSubmissionSource; Type: TYPE; Schema: public; Owner: sdgadmin
--

CREATE TYPE public."RecyclingSubmissionSource" AS ENUM (
    'MANUAL',
    'QR'
);


ALTER TYPE public."RecyclingSubmissionSource" OWNER TO sdgadmin;

--
-- Name: RecyclingSubmissionStatus; Type: TYPE; Schema: public; Owner: sdgadmin
--

CREATE TYPE public."RecyclingSubmissionStatus" AS ENUM (
    'PENDING_REVIEW',
    'APPROVED',
    'REJECTED'
);


ALTER TYPE public."RecyclingSubmissionStatus" OWNER TO sdgadmin;

--
-- Name: RedemptionStatus; Type: TYPE; Schema: public; Owner: sdgadmin
--

CREATE TYPE public."RedemptionStatus" AS ENUM (
    'RESERVED',
    'COMPLETED',
    'CANCELLED'
);


ALTER TYPE public."RedemptionStatus" OWNER TO sdgadmin;

--
-- Name: Role; Type: TYPE; Schema: public; Owner: sdgadmin
--

CREATE TYPE public."Role" AS ENUM (
    'STUDENT',
    'ADMIN'
);


ALTER TYPE public."Role" OWNER TO sdgadmin;

--
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

--
-- Name: refund_points_and_stock_when_redemption_cancelled(); Type: FUNCTION; Schema: public; Owner: sdgadmin
--

CREATE FUNCTION public.refund_points_and_stock_when_redemption_cancelled() RETURNS trigger
    LANGUAGE plpgsql
    AS $_$
DECLARE
  next_points_event_id text;
BEGIN
  -- Auto-fill cancelledAt when directly changing status to CANCELLED
  IF NEW."status" = 'CANCELLED'
     AND OLD."status" IS DISTINCT FROM NEW."status"
     AND NEW."cancelledAt" IS NULL THEN
    NEW."cancelledAt" = NOW();
  END IF;

  -- Auto-fill completedAt when directly changing status to COMPLETED
  IF NEW."status" = 'COMPLETED'
     AND OLD."status" IS DISTINCT FROM NEW."status"
     AND NEW."completedAt" IS NULL THEN
    NEW."completedAt" = NOW();
  END IF;

  -- Refund points and stock only when RESERVED -> CANCELLED
  IF OLD."status" = 'RESERVED'
     AND NEW."status" = 'CANCELLED' THEN

    IF NEW."rewardId" IS NOT NULL THEN
      UPDATE "Reward"
      SET "stock" = "stock" + NEW."quantity"
      WHERE "id" = NEW."rewardId";
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM "PointsEvent"
      WHERE "redemptionId" = NEW."id"
        AND "eventType" = 'REWARD_REFUNDED'
    ) THEN

      SELECT
        'PEV' || LPAD(
          (
            COALESCE(
              MAX(
                CASE
                  WHEN "id" ~ '^PEV[0-9]+$'
                  THEN SUBSTRING("id" FROM 4)::int
                  ELSE 0
                END
              ),
              0
            ) + 1
          )::text,
          3,
          '0'
        )
      INTO next_points_event_id
      FROM "PointsEvent";

      INSERT INTO "PointsEvent" (
        "id",
        "userId",
        "redemptionId",
        "points",
        "eventType",
        "status",
        "approvedAt",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        next_points_event_id,
        NEW."userId",
        NEW."id",
        NEW."pointsSpent",
        'REWARD_REFUNDED',
        'SENT',
        NOW(),
        NOW(),
        NOW()
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$_$;


ALTER FUNCTION public.refund_points_and_stock_when_redemption_cancelled() OWNER TO sdgadmin;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
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
-- Name: AuditLog; Type: TABLE; Schema: public; Owner: sdgadmin
--

CREATE TABLE public."AuditLog" (
    id text NOT NULL,
    action text NOT NULL,
    "userId" text,
    details jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."AuditLog" OWNER TO sdgadmin;

--
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
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "rewardPoints" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public."Badge" OWNER TO sdgadmin;

--
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
-- Name: PointRate; Type: TABLE; Schema: public; Owner: sdgadmin
--

CREATE TABLE public."PointRate" (
    material text NOT NULL,
    "ratePerKg" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public."PointRate" OWNER TO sdgadmin;

--
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
-- Name: RewardTier; Type: TABLE; Schema: public; Owner: sdgadmin
--

CREATE TABLE public."RewardTier" (
    tier text NOT NULL,
    "pointsRequired" integer NOT NULL
);


ALTER TABLE public."RewardTier" OWNER TO sdgadmin;

--
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
-- Data for Name: AdminNotification; Type: TABLE DATA; Schema: public; Owner: sdgadmin
--

COPY public."AdminNotification" (id, type, "targetUserId", message, "isRead", "readAt", "readById", "createdAt") FROM stdin;
NOT001	USER_DEACTIVATED	USR005	Janusha Suma A/P V Vasanthan (M44100198@student.uow.edu.my) was auto-deactivated after 3 days of recycling inactivity.	f	\N	\N	2026-08-10 02:00:06.042
NOT002	USER_DEACTIVATED	USR006	Wang Sidi (M44100050@student.uow.edu.my) was auto-deactivated after 3 days of recycling inactivity.	f	\N	\N	2026-08-10 02:00:06.309
NOT003	USER_DEACTIVATED	USR007	Vickramraaj Chan Gurusamy (m44100477@student.uow.edu.my) was auto-deactivated after 3 days of recycling inactivity.	f	\N	\N	2026-08-10 02:00:06.437
NOT004	USER_DEACTIVATED	USR002	Student One (student1@student.uow.edu.my) was auto-deactivated after 3 days of recycling inactivity.	f	\N	\N	2026-08-10 02:00:06.835
NOT005	USER_DEACTIVATED	USR004	Student Three (student3@student.uow.edu.my) was auto-deactivated after 3 days of recycling inactivity.	f	\N	\N	2026-08-10 02:00:06.978
NOT006	USER_DEACTIVATED	USR012	Ali Ali (12345@student.uow.edu.my) was auto-deactivated after 3 days of recycling inactivity.	f	\N	\N	2026-08-11 02:00:05.24
NOT007	USER_DEACTIVATED	USR003	Student Two (student2@student.uow.edu.my) was auto-deactivated after 3 days of recycling inactivity.	f	\N	\N	2026-08-11 02:00:05.366
\.


--
-- Data for Name: AuditLog; Type: TABLE DATA; Schema: public; Owner: sdgadmin
--

COPY public."AuditLog" (id, action, "userId", details, "createdAt") FROM stdin;
AUD001	MISSION_SUBMISSION_REVIEWED	USR001	{"status": "APPROVED", "missionId": "MIS004", "submissionId": "SUB024"}	2026-08-10 05:09:19.024
AUD002	MISSION_SUBMISSION_REVIEWED	USR001	{"status": "APPROVED", "missionId": "MIS003", "submissionId": "SUB025"}	2026-08-10 05:13:10.868
\.


--
-- Data for Name: Badge; Type: TABLE DATA; Schema: public; Owner: sdgadmin
--

COPY public."Badge" (id, slug, name, description, tier, "criteriaType", "criteriaValue", "criteriaReferenceId", "criteriaReference", "isActive", "createdAt", "updatedAt", "rewardPoints") FROM stdin;
BDG001	mission-finisher	Mission Finisher	Finish one mission by reaching its required progress target.	BRONZE	MISSIONS_COMPLETED	1	\N	\N	t	2026-08-06 09:44:42.407	2026-08-06 09:44:42.407	0
BDG002	mission-achiever	Mission Achiever	Finish three missions by reaching each mission's full progress target.	SILVER	MISSIONS_COMPLETED	3	\N	\N	t	2026-08-06 09:44:42.413	2026-08-06 09:44:42.413	0
BDG003	mission-master	Mission Master	Finish five missions by fully completing their required progress.	GOLD	MISSIONS_COMPLETED	5	\N	\N	t	2026-08-06 09:44:42.417	2026-08-06 09:44:42.417	0
BDG004	quiz-pass-starter	Quiz Pass Starter	Submit a quiz attempt and pass it once.	BRONZE	QUIZZES_PASSED	1	\N	\N	t	2026-08-06 09:44:42.423	2026-08-06 09:44:42.423	0
BDG005	quiz-pass-builder	Quiz Pass Builder	Submit and pass three quiz attempts.	SILVER	QUIZZES_PASSED	3	\N	\N	t	2026-08-06 09:44:42.428	2026-08-06 09:44:42.428	0
BDG006	quiz-pass-expert	Quiz Pass Expert	Submit and pass five quiz attempts.	GOLD	QUIZZES_PASSED	5	\N	\N	t	2026-08-06 09:44:42.432	2026-08-06 09:44:42.432	0
BDG007	content-starter	Content Starter	Complete one learning content item. Each content item only counts once.	BRONZE	CONTENT_COMPLETED	1	\N	\N	t	2026-08-06 09:44:42.436	2026-08-06 09:44:42.436	0
BDG008	knowledge-collector	Knowledge Collector	Complete three different learning content items.	SILVER	CONTENT_COMPLETED	3	\N	\N	t	2026-08-06 09:44:42.44	2026-08-06 09:44:42.44	0
BDG009	eco-scholar	Eco Scholar	Complete five different learning content items.	GOLD	CONTENT_COMPLETED	5	\N	\N	t	2026-08-06 09:44:42.445	2026-08-06 09:44:42.445	0
BDG010	first-approval	First Approval	Receive one approved mission submission.	BRONZE	APPROVED_SUBMISSIONS	1	\N	\N	t	2026-08-06 09:44:42.449	2026-08-06 09:44:42.449	0
BDG011	verified-contributor	Verified Contributor	Receive five approved mission submissions.	SILVER	APPROVED_SUBMISSIONS	5	\N	\N	t	2026-08-06 09:44:42.452	2026-08-06 09:44:42.452	0
BDG012	approval-champion	Approval Champion	Receive ten approved mission submissions.	GOLD	APPROVED_SUBMISSIONS	10	\N	\N	t	2026-08-06 09:44:42.457	2026-08-06 09:44:42.457	0
BDG013	recycling-starter	Recycling Starter	Receive one approved recycling submission outside mission proof.	BRONZE	RECYCLING_APPROVED	1	\N	\N	t	2026-08-06 09:44:42.462	2026-08-06 09:44:42.462	0
BDG014	recycling-regular	Recycling Regular	Receive five approved recycling submissions outside mission proof.	SILVER	RECYCLING_APPROVED	5	\N	\N	t	2026-08-06 09:44:42.466	2026-08-06 09:44:42.466	0
BDG015	recycling-champion	Recycling Champion	Receive ten approved recycling submissions outside mission proof.	GOLD	RECYCLING_APPROVED	10	\N	\N	t	2026-08-06 09:44:42.47	2026-08-06 09:44:42.47	0
\.


--
-- Data for Name: BadgeAward; Type: TABLE DATA; Schema: public; Owner: sdgadmin
--

COPY public."BadgeAward" (id, "userId", "badgeId", "awardedAt") FROM stdin;
AWD001	USR004	BDG013	2026-08-06 09:58:12.341
AWD002	USR002	BDG001	2026-08-06 11:06:08.422
AWD003	USR002	BDG010	2026-08-06 11:06:08.572
AWD004	USR002	BDG013	2026-08-06 11:06:08.594
AWD005	USR003	BDG013	2026-08-06 11:38:34.456
AWD006	USR002	BDG007	2026-08-06 14:22:47.05
AWD007	USR002	BDG004	2026-08-06 14:22:48.895
AWD011	USR011	BDG013	2026-08-06 15:00:08.619
AWD012	USR011	BDG010	2026-08-06 15:03:11.47
AWD013	USR011	BDG001	2026-08-06 15:08:24.411
AWD017	USR002	BDG002	2026-08-06 16:18:54.352
AWD018	USR012	BDG013	2026-08-07 02:06:12.412
AWD019	USR012	BDG001	2026-08-07 02:09:10.064
AWD020	USR012	BDG010	2026-08-07 02:09:10.189
AWD021	USR013	BDG001	2026-08-09 12:59:22.721
AWD022	USR013	BDG010	2026-08-09 12:59:22.76
AWD023	USR013	BDG013	2026-08-09 13:01:34.305
AWD024	USR014	BDG010	2026-08-09 13:36:47.709
AWD025	USR014	BDG001	2026-08-10 05:09:18.52
AWD028	USR014	BDG004	2026-08-10 05:18:17.633
AWD029	USR014	BDG007	2026-08-10 05:18:17.655
AWD030	USR014	BDG013	2026-08-10 07:45:09.278
AWD031	USR011	BDG011	2026-08-10 13:32:46.25
AWD032	USR015	BDG010	2026-08-10 14:17:38.851
AWD033	USR016	BDG004	2026-08-11 03:41:10.757
AWD034	USR016	BDG007	2026-08-11 03:41:10.78
AWD035	USR016	BDG001	2026-08-11 03:53:14.115
AWD036	USR016	BDG010	2026-08-11 03:53:14.159
AWD037	USR017	BDG013	2026-08-11 03:55:16.495
AWD038	USR016	BDG013	2026-08-11 04:06:43.464
AWD039	USR018	BDG010	2026-08-11 04:57:48.309
AWD040	USR019	BDG013	2026-08-11 06:04:44.261
AWD041	USR019	BDG010	2026-08-11 06:19:00.6
AWD042	USR011	BDG002	2026-08-11 09:16:30.149
AWD043	USR019	BDG001	2026-08-11 09:18:36.765
AWD044	USR015	BDG001	2026-08-11 09:48:53.612
\.


--
-- Data for Name: Content; Type: TABLE DATA; Schema: public; Owner: sdgadmin
--

COPY public."Content" (id, slug, title, body, tags, status, version, "createdById", "createdAt", "updatedAt", summary, "imageUrl", "estimatedReadMinutes", "contentBlocks") FROM stdin;
CNT001	plastic-recycling-basics	Plastic Recycling Basics	Plastic recycling starts with knowing what each container is made from and whether it is clean enough to be processed. This guide explains how to read plastic codes, rinse common packaging, and sort bottles before they reach the recycling bin.	{plastic,sorting,cleanliness}	PUBLISHED	1	USR001	2026-08-06 09:44:42.309	2026-08-06 09:44:42.309	Learn how to identify common plastic recycling codes and sort them correctly.	https://commons.wikimedia.org/wiki/Special:FilePath/Plastic_Bottle_Recycling_Bin.jpg	6	[{"text": "Plastic recycling starts with knowing what each container is made from and whether it is clean enough to be processed. A quick rinse and correct sorting step can prevent an entire batch from becoming contaminated.", "type": "paragraph"}, {"text": "Read the Plastic Code", "type": "heading"}, {"text": "Most bottles and food containers have a small number inside the recycling triangle. PET and HDPE are usually accepted more widely, while mixed plastics may need special handling depending on your local facility.", "type": "paragraph"}, {"alt": "Sorted plastic bottles prepared for recycling", "url": "https://commons.wikimedia.org/wiki/Special:FilePath/Plastic_Bottle_Recycling_Bin.jpg", "type": "image"}, {"text": "Clean Before Sorting", "type": "heading"}, {"text": "Food residue, liquid, and greasy labels can lower recycling quality. Empty the bottle, rinse it lightly, and flatten it if your campus recycling station asks for compact items.", "type": "paragraph"}]
CNT002	paper-recycling-essentials	Paper Recycling Essentials	Paper recycling works best when paper is dry, clean, and separated from food waste. This article explains what paper can be recycled and why wet or greasy paper should be kept out of the recycling stream.	{paper,cleanliness,sorting}	PUBLISHED	1	USR001	2026-08-06 09:44:42.328	2026-08-06 09:44:42.328	Understand contamination rules and how to prepare paper for recycling.	https://commons.wikimedia.org/wiki/Special:FilePath/Recyclable_Cardboard_Packaging.jpg	5	[{"text": "Paper recycling works best when paper is dry, clean, and separated from food waste. Even a small amount of grease or moisture can make a stack of paper harder to process.", "type": "paragraph"}, {"text": "Keep Paper Dry", "type": "heading"}, {"text": "Notebook paper, clean cardboard, flyers, and envelopes are usually accepted. Tissue, greasy takeaway boxes, and wet paper should be handled as waste or compost depending on local rules.", "type": "paragraph"}, {"alt": "Clean paper and cardboard sorted for recycling", "url": "https://commons.wikimedia.org/wiki/Special:FilePath/Recycled_Paper_Pulp%2C_Post-Consumer_Waste_Recycling_Material_%2843544030305%29.jpg", "type": "image"}, {"text": "Flatten Cardboard", "type": "heading"}, {"text": "Flattening cardboard saves bin space and helps collection teams move material more efficiently. Remove plastic tape or food liners where possible before recycling.", "type": "paragraph"}]
CNT003	e-waste-recycling-awareness	E-Waste Recycling Awareness	E-waste contains valuable materials, but it can also contain batteries, heavy metals, and parts that should not enter normal bins. Learn how to store old devices safely and send them to the correct collection point.	{ewaste,safety,general}	PUBLISHED	1	USR001	2026-08-06 09:44:42.338	2026-08-06 09:44:42.338	Discover safe disposal paths for electronics and batteries on campus.	https://commons.wikimedia.org/wiki/Special:FilePath/E-Waste_Recycling_%287027059003%29.jpg	7	[{"text": "E-waste contains valuable materials, but it can also contain batteries, heavy metals, and parts that should not enter normal bins. A separate collection path keeps people and the environment safer.", "type": "paragraph"}, {"text": "Separate Batteries", "type": "heading"}, {"text": "Loose lithium batteries can be a fire risk when crushed or exposed to heat. Tape battery terminals where required and place them in a designated battery collection box.", "type": "paragraph"}, {"alt": "Electronic components prepared for recycling", "url": "https://commons.wikimedia.org/wiki/Special:FilePath/E-Waste_Recycling_%287027059003%29.jpg", "type": "image"}, {"text": "Use Approved Drop-Off Points", "type": "heading"}, {"text": "Phones, chargers, headphones, circuit boards, and small appliances should go to campus e-waste drives or certified recycling partners instead of general waste bins.", "type": "paragraph"}]
\.


--
-- Data for Name: ContentRevision; Type: TABLE DATA; Schema: public; Owner: sdgadmin
--

COPY public."ContentRevision" (id, "contentId", version, title, body, tags, status, "createdAt", summary, "imageUrl", "estimatedReadMinutes", "contentBlocks") FROM stdin;
CRV00101	CNT001	1	Plastic Recycling Basics	Plastic recycling starts with knowing what each container is made from and whether it is clean enough to be processed. This guide explains how to read plastic codes, rinse common packaging, and sort bottles before they reach the recycling bin.	{plastic,sorting,cleanliness}	PUBLISHED	2026-08-06 09:44:42.32	Learn how to identify common plastic recycling codes and sort them correctly.	https://commons.wikimedia.org/wiki/Special:FilePath/Plastic_Bottle_Recycling_Bin.jpg	6	[{"text": "Plastic recycling starts with knowing what each container is made from and whether it is clean enough to be processed. A quick rinse and correct sorting step can prevent an entire batch from becoming contaminated.", "type": "paragraph"}, {"text": "Read the Plastic Code", "type": "heading"}, {"text": "Most bottles and food containers have a small number inside the recycling triangle. PET and HDPE are usually accepted more widely, while mixed plastics may need special handling depending on your local facility.", "type": "paragraph"}, {"alt": "Sorted plastic bottles prepared for recycling", "url": "https://commons.wikimedia.org/wiki/Special:FilePath/Plastic_Bottle_Recycling_Bin.jpg", "type": "image"}, {"text": "Clean Before Sorting", "type": "heading"}, {"text": "Food residue, liquid, and greasy labels can lower recycling quality. Empty the bottle, rinse it lightly, and flatten it if your campus recycling station asks for compact items.", "type": "paragraph"}]
CRV00201	CNT002	1	Paper Recycling Essentials	Paper recycling works best when paper is dry, clean, and separated from food waste. This article explains what paper can be recycled and why wet or greasy paper should be kept out of the recycling stream.	{paper,cleanliness,sorting}	PUBLISHED	2026-08-06 09:44:42.334	Understand contamination rules and how to prepare paper for recycling.	https://commons.wikimedia.org/wiki/Special:FilePath/Recyclable_Cardboard_Packaging.jpg	5	[{"text": "Paper recycling works best when paper is dry, clean, and separated from food waste. Even a small amount of grease or moisture can make a stack of paper harder to process.", "type": "paragraph"}, {"text": "Keep Paper Dry", "type": "heading"}, {"text": "Notebook paper, clean cardboard, flyers, and envelopes are usually accepted. Tissue, greasy takeaway boxes, and wet paper should be handled as waste or compost depending on local rules.", "type": "paragraph"}, {"alt": "Clean paper and cardboard sorted for recycling", "url": "https://commons.wikimedia.org/wiki/Special:FilePath/Recycled_Paper_Pulp%2C_Post-Consumer_Waste_Recycling_Material_%2843544030305%29.jpg", "type": "image"}, {"text": "Flatten Cardboard", "type": "heading"}, {"text": "Flattening cardboard saves bin space and helps collection teams move material more efficiently. Remove plastic tape or food liners where possible before recycling.", "type": "paragraph"}]
CRV00301	CNT003	1	E-Waste Recycling Awareness	E-waste contains valuable materials, but it can also contain batteries, heavy metals, and parts that should not enter normal bins. Learn how to store old devices safely and send them to the correct collection point.	{ewaste,safety,general}	PUBLISHED	2026-08-06 09:44:42.348	Discover safe disposal paths for electronics and batteries on campus.	https://commons.wikimedia.org/wiki/Special:FilePath/E-Waste_Recycling_%287027059003%29.jpg	7	[{"text": "E-waste contains valuable materials, but it can also contain batteries, heavy metals, and parts that should not enter normal bins. A separate collection path keeps people and the environment safer.", "type": "paragraph"}, {"text": "Separate Batteries", "type": "heading"}, {"text": "Loose lithium batteries can be a fire risk when crushed or exposed to heat. Tape battery terminals where required and place them in a designated battery collection box.", "type": "paragraph"}, {"alt": "Electronic components prepared for recycling", "url": "https://commons.wikimedia.org/wiki/Special:FilePath/E-Waste_Recycling_%287027059003%29.jpg", "type": "image"}, {"text": "Use Approved Drop-Off Points", "type": "heading"}, {"text": "Phones, chargers, headphones, circuit boards, and small appliances should go to campus e-waste drives or certified recycling partners instead of general waste bins.", "type": "paragraph"}]
\.


--
-- Data for Name: LearningProgress; Type: TABLE DATA; Schema: public; Owner: sdgadmin
--

COPY public."LearningProgress" (id, "userId", "contentId", completed, "completionCount", "quizAttemptsCount", "passedQuizCount", "latestScore", "lastActivityAt", "createdAt", "updatedAt", "bestScore") FROM stdin;
PRG002002	USR002	CNT002	f	0	0	0	\N	2026-08-06 09:44:42.594	2026-08-06 09:44:42.594	2026-08-06 09:44:42.594	\N
PRG002003	USR002	CNT003	f	0	0	0	\N	2026-08-06 09:44:42.604	2026-08-06 09:44:42.604	2026-08-06 09:44:42.604	\N
PRG003002	USR003	CNT002	f	0	0	0	\N	2026-08-06 09:44:42.632	2026-08-06 09:44:42.632	2026-08-06 09:44:42.632	\N
PRG003003	USR003	CNT003	f	0	0	0	\N	2026-08-06 09:44:42.642	2026-08-06 09:44:42.642	2026-08-06 09:44:42.642	\N
PRG004001	USR004	CNT001	f	0	0	0	\N	2026-08-06 09:44:42.653	2026-08-06 09:44:42.653	2026-08-06 09:44:42.653	\N
PRG004002	USR004	CNT002	f	0	0	0	\N	2026-08-06 09:44:42.664	2026-08-06 09:44:42.664	2026-08-06 09:44:42.664	\N
PRG004003	USR004	CNT003	f	0	0	0	\N	2026-08-06 09:44:42.674	2026-08-06 09:44:42.674	2026-08-06 09:44:42.674	\N
PRG003001	USR003	CNT001	f	0	1	0	3	2026-08-06 11:40:38.416	2026-08-06 09:44:42.616	2026-08-06 11:40:38.427	3
PRG002001	USR002	CNT001	t	1	1	0	1	2026-08-06 14:22:46.996	2026-08-06 09:44:42.578	2026-08-06 14:22:47.004	1
PRG4006	USR011	CNT003	f	0	1	0	2	2026-08-06 15:09:54.455	2026-08-06 15:09:54.465	2026-08-06 15:09:54.465	2
PRG4008	USR014	CNT003	t	1	1	1	5	2026-08-10 05:18:17.414	2026-08-10 05:18:17.425	2026-08-10 05:18:17.425	5
PRG4007	USR014	CNT001	f	0	2	0	1	2026-08-10 07:45:05.954	2026-08-09 13:41:50.624	2026-08-10 07:45:06.544	1
PRG4009	USR011	CNT001	f	0	1	0	1	2026-08-10 13:34:08.299	2026-08-10 13:34:08.493	2026-08-10 13:34:08.493	1
PRG4010	USR016	CNT003	t	1	2	1	0	2026-08-11 03:56:00.19	2026-08-11 03:41:10.711	2026-08-11 03:56:00.287	5
\.


--
-- Data for Name: Mission; Type: TABLE DATA; Schema: public; Owner: sdgadmin
--

COPY public."Mission" (id, slug, title, description, type, "startAt", "endAt", "submissionCap", points, "autoApprove", "isActive", status, "createdById", "createdAt", "updatedAt", guide, "imageUrl", "longDescription", "targetQuantity", "targetDays") FROM stdin;
MIS001	bottle-count-challenge	Bottle Count Challenge	Collect and record recyclable plastic bottles this week.	QUANTITY_BASED	2026-08-06 09:44:42.189	2026-08-13 09:44:42.189	20	25	t	t	ACTIVE	USR001	2026-08-06 09:44:42.192	2026-08-06 09:44:42.192	[{"step": 1, "title": "Collect Plastic Bottles", "description": "Gather empty plastic bottles from your home, classroom, or workplace."}, {"step": 2, "title": "Sort and Count", "description": "Separate recyclable plastic bottles and count the total quantity."}, {"step": 3, "title": "Take Proof", "description": "Take a clear photo showing the collected bottles before recycling them."}, {"step": 4, "title": "Submit Mission", "description": "Upload the photo and enter the total number of bottles collected."}]	https://commons.wikimedia.org/wiki/Special:FilePath/Plastic%20bottles%20for%20recycling.jpg	Reduce plastic waste by collecting recyclable plastic bottles from your home, campus, or workplace throughout the week. Sort and count the bottles before submitting your total to encourage responsible recycling habits. Every bottle recycled contributes to a cleaner environment and helps reduce landfill waste.	20	\N
MIS003	weekend-e-waste-drive	Weekend E-Waste Drive	Join the campus e-waste collection event and share evidence.	TIME_LIMITED	2026-08-06 09:44:42.189	2026-08-13 09:44:42.189	1	50	t	t	ACTIVE	USR001	2026-08-06 09:44:42.212	2026-08-06 09:44:42.212	[{"step": 1, "title": "Prepare E-Waste", "description": "Collect unused electronic devices or accessories that are no longer needed."}, {"step": 2, "title": "Visit the Collection Point", "description": "Bring your e-waste to the designated campus collection location during the event."}, {"step": 3, "title": "Take Proof", "description": "Capture a photo of yourself or your items at the collection point."}, {"step": 4, "title": "Submit Participation", "description": "Upload the photo as proof to complete the mission."}]	https://commons.wikimedia.org/wiki/Special:FilePath/Recycled%20Electronics%20-%20Circuit%20Boards%20(48659415958).jpg	Participate in the campus weekend e-waste collection drive by bringing unwanted electronic items for proper disposal. Recycling electronic waste prevents harmful materials from polluting the environment and allows valuable resources to be recovered. Share your participation by submitting evidence after dropping off your items.	\N	\N
MIS004	campus-recycling-spotlight	Campus Recycling Spotlight	Find and photograph a recycling-related item or area on campus.	TIME_LIMITED	2026-08-06 14:17:30.264	2026-08-31 15:17:30.264	1	20	t	t	ACTIVE	USR001	2026-08-06 14:22:49.944	2026-08-06 14:22:50.341	[{"step": 1, "title": "Explore Campus", "description": "Walk around campus and look for recycling-related items, areas, or signs."}, {"step": 2, "title": "Take a Photo", "description": "Capture a clear photo of the recycling element you found."}, {"step": 3, "title": "Add a Short Note", "description": "Briefly explain what you found and why it relates to recycling."}, {"step": 4, "title": "Submit Proof", "description": "Upload your photo and explanation to complete the mission."}]	https://upload.wikimedia.org/wikipedia/commons/6/67/USC_Recycling_Bin.png	Explore the campus and look for something that represents recycling or sustainability in action. It can be a recycling bin, a collection point, reused material, a sustainability poster, or any visible recycling effort around campus. Take a clear photo and upload it as proof. This mission is designed to be simple, fun, and to help students notice the recycling ecosystem around them.	\N	\N
MIS002	three-day-recycling-streak	Three Day Recycling Streak	Maintain three consecutive days of recycling activity.	STREAK_BASED	2026-08-06 09:44:42.189	2026-08-13 09:44:42.189	3	40	t	t	ACTIVE	USR001	2026-08-06 09:44:42.205	2026-08-06 09:44:42.205	[{"step": 1, "title": "Recycle Daily", "description": "Complete at least one recycling activity each day for three consecutive days."}, {"step": 2, "title": "Document Your Activity", "description": "Take a photo or record proof of each day's recycling effort."}, {"step": 3, "title": "Keep Your Streak", "description": "Do not skip a day, or your streak will need to start again."}, {"step": 4, "title": "Submit Your Progress", "description": "Upload your proof after completing the three-day streak."}]	https://commons.wikimedia.org/wiki/Special:FilePath/Recyclables.JPG	Build a sustainable habit by completing at least one recycling activity each day for three consecutive days. Consistency is the key to making environmental responsibility part of your daily routine. Record your progress every day to successfully complete the challenge.	\N	3
\.


--
-- Data for Name: MissionSubmission; Type: TABLE DATA; Schema: public; Owner: sdgadmin
--

COPY public."MissionSubmission" (id, "missionId", "userId", "proofText", "proofImageUrl", quantity, status, "reviewNote", "reviewedById", "submittedAt", "reviewedAt") FROM stdin;
SUB001	MIS001	USR002	Collected 20 bottles from the cafeteria bins.	\N	20	APPROVED	\N	USR001	2026-08-06 09:44:42.536	2026-08-06 09:44:42.535
SUB002	MIS002	USR003	Maintained my recycling streak for three days.	\N	\N	PENDING_REVIEW	\N	\N	2026-08-06 09:44:42.57	\N
SUB004	MIS003	USR002	test	https://stsdguploads.blob.core.windows.net/mission-proofs/USR002/1786015518002-mission-proofjpg	\N	APPROVED	\N	\N	2026-08-06 11:25:05.849	\N
SUB003	MIS002	USR002	Submitted from Postman shared collection.	\N	3	APPROVED	\N	\N	2026-08-06 11:16:19.995	2026-08-06 14:22:47.213
SUB012	MIS004	USR002	Testing for this new mission	https://stsdguploads.blob.core.windows.net/mission-proofs/USR002/1786033133242-mission-proofjpg	\N	APPROVED	\N	\N	2026-08-06 16:18:33.558	2026-08-06 16:18:53.756
SUB014	MIS001	USR003	Test1	https://stsdguploads.blob.core.windows.net/mission-proofs/USR003/1786072094019-mission-proofjpg	2	PENDING_REVIEW	\N	\N	2026-08-07 03:07:54.76	\N
SUB015	MIS003	USR003	e waste test	https://stsdguploads.blob.core.windows.net/mission-proofs/USR003/1786076058722-mission-proofjpg	\N	PENDING_REVIEW	\N	\N	2026-08-07 04:13:56.533	\N
SUB016	MIS004	USR013	hello	https://stsdguploads.blob.core.windows.net/mission-proofs/USR013/1786280362365-qr008png	1	APPROVED	\N	\N	2026-08-09 12:59:08.561	2026-08-09 12:59:22.619
SUB017	MIS003	USR013	herrr	https://stsdguploads.blob.core.windows.net/mission-proofs/USR013/1786280388452-qr008png	1	REJECTED	alamak	USR001	2026-08-09 12:59:38.788	2026-08-09 13:01:08.829
SUB019	MIS004	USR003	\N	\N	\N	ONGOING	\N	\N	2026-08-09 13:41:49.064	\N
SUB022	MIS004	USR011	merp morp beep boop	https://stsdguploads.blob.core.windows.net/mission-proofs/USR011/1786337629145-mission-proofjpg	\N	APPROVED	\N	\N	2026-08-10 04:47:31.798	2026-08-10 04:53:50.982
SUB023	MIS002	USR011	Day 1 submission.	https://stsdguploads.blob.core.windows.net/mission-proofs/USR011/1786337725924-mission-proofjpg	\N	APPROVED	\N	\N	2026-08-10 04:54:48.274	2026-08-10 04:55:26.014
SUB006	MIS001	USR011	HIIIII	https://stsdguploads.blob.core.windows.net/mission-proofs/USR011/1786028542622-mission-proofjpg	3	APPROVED	\N	USR001	2026-08-06 15:01:59.545	2026-08-06 15:03:11.284
SUB007	MIS001	USR011	HIIIIIx2	https://stsdguploads.blob.core.windows.net/mission-proofs/USR011/1786028883026-mission-proofjpg	18	APPROVED	\N	USR001	2026-08-06 15:08:03.984	2026-08-06 15:08:24.193
SUB013	MIS003	USR012	testing	https://stsdguploads.blob.core.windows.net/mission-proofs/USR012/1786068498354-mission-proofjpg	\N	APPROVED	\N	USR001	2026-08-07 02:07:42.911	2026-08-07 02:09:09.74
SUB018	MIS001	USR014	www	https://stsdguploads.blob.core.windows.net/mission-proofs/USR014/1786282289533-a6png	5	APPROVED	\N	USR001	2026-08-09 13:30:09.884	2026-08-09 13:36:47.566
SUB024	MIS004	USR014	Spoted recyling materials	https://stsdguploads.blob.core.windows.net/mission-proofs/USR014/1786338491510-mission-proofjpg	\N	APPROVED	\N	USR001	2026-08-10 05:07:49.509	2026-08-10 05:09:18.434
SUB025	MIS002	USR014	UAT TC-01-001: submitting e-waste drive participation proof.	\N	\N	APPROVED	Approved during UAT demo (TC-03-001).	USR001	2026-08-10 07:40:16.961	2026-08-10 07:40:46.301
SUB026	MIS002	USR014	UAT TC-02-001: duplicate submission attempt, should be rejected.	\N	\N	APPROVED	\N	USR001	2026-08-10 07:41:03.807	2026-08-10 07:42:24.517
SUB027	MIS003	USR014	\N	\N	\N	ONGOING	\N	\N	2026-08-10 07:58:20.14	\N
SUB021	MIS001	USR011	UAT TC-01-001: submitting e-waste drive participation proof.	\N	\N	APPROVED	Approved during UAT demo (TC-03-001).	USR001	2026-08-10 04:46:55.992	2026-08-10 13:32:45.842
SUB028	MIS004	USR015	empty boxes and written paper	https://stsdguploads.blob.core.windows.net/mission-proofs/USR015/1786369735010-mission-proofjpg	\N	PENDING_REVIEW	\N	\N	2026-08-10 13:48:55.926	\N
SUB030	MIS002	USR015	UAT TC-01-001: submitting e-waste drive participation proof.	\N	\N	PENDING_REVIEW	\N	\N	2026-08-10 14:09:05.626	\N
SUB029	MIS001	USR015	recycled a plastic cup	https://stsdguploads.blob.core.windows.net/mission-proofs/USR015/1786370077415-mission-proofjpg	1	APPROVED	Approved during UAT demo (TC-03-001).	USR001	2026-08-10 13:53:40.648	2026-08-10 14:17:38.489
SUB031	MIS004	USR016	so this recycling bins are very accessible to people are at level 5, so that they can easily take part in recycling any items.	https://stsdguploads.blob.core.windows.net/mission-proofs/USR016/1786419561128-mission-proofjpg	\N	APPROVED	Approved during UAT demo (TC-03-001).	USR001	2026-08-11 03:32:24.12	2026-08-11 03:53:13.73
SUB032	MIS001	USR018	One 800 ml bottle only	https://stsdguploads.blob.core.windows.net/mission-proofs/USR018/1786423057891-mission-proofjpg	1	APPROVED	Approved during UAT demo (TC-03-001).	USR001	2026-08-11 04:36:36.368	2026-08-11 04:57:47.867
SUB033	MIS001	USR018	UAT TC-01-001: submitting e-waste drive participation proof.	\N	\N	PENDING_REVIEW	\N	\N	2026-08-11 05:01:17.323	\N
SUB034	MIS004	USR019	\N	\N	\N	ONGOING	\N	\N	2026-08-11 05:58:10.202	\N
SUB035	MIS001	USR019	one bottle at a time.	https://stsdguploads.blob.core.windows.net/mission-proofs/USR019/1786428145907-mission-proofjpg	1	APPROVED	Approved during UAT demo (TC-03-001).	USR001	2026-08-11 05:58:40.467	2026-08-11 06:19:00.433
SUB020	MIS003	USR011	Testing auto-approve feature	https://stsdguploads.blob.core.windows.net/mission-proofs/USR011/1786439789497-mission-proofjpg	\N	APPROVED	\N	\N	2026-08-09 14:05:43.62	2026-08-11 09:16:29.943
SUB036	MIS003	USR019	UAT TC-01-001: submitting e-waste drive participation proof.	\N	\N	APPROVED	\N	\N	2026-08-11 09:18:36.712	2026-08-11 09:18:36.625
SUB037	MIS003	USR015	Testing Auto-Approval #2	https://stsdguploads.blob.core.windows.net/mission-proofs/USR015/1786441733218-mission-proofjpg	\N	APPROVED	\N	\N	2026-08-11 09:48:32.662	2026-08-11 09:48:53.451
SUB038	MIS001	USR015	UAT TC-01-001: submitting e-waste drive participation proof.	\N	\N	APPROVED	\N	\N	2026-08-11 09:50:22.684	2026-08-11 09:50:22.583
SUB039	MIS001	USR015	UAT TC-02-001: duplicate submission attempt, should be rejected.	\N	\N	APPROVED	\N	\N	2026-08-11 09:50:38.459	2026-08-11 09:50:38.44
\.


--
-- Data for Name: PointRate; Type: TABLE DATA; Schema: public; Owner: sdgadmin
--

COPY public."PointRate" (material, "ratePerKg") FROM stdin;
Plastic	50
Paper	20
Glass	30
Metal	60
\.


--
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
PEV010	USR002	\N	\N	-100	REWARD_REDEEMED	SENT	2026-08-06 14:22:55.677	\N	\N	2026-08-06 14:22:55.74	2026-08-06 14:22:55.74	\N	RDM003
PEV011	USR002	\N	\N	-300	REWARD_REDEEMED	SENT	2026-08-06 14:22:56.388	\N	\N	2026-08-06 14:22:56.413	2026-08-06 14:22:56.413	\N	RDM004
PEV012	USR002	\N	\N	300	REWARD_REFUNDED	SENT	2026-08-06 14:22:56.609	\N	\N	2026-08-06 14:22:56.629	2026-08-06 14:22:56.629	\N	RDM004
PEV013	USR002	\N	\N	-600	REWARD_REDEEMED	SENT	2026-08-06 14:22:56.885	\N	\N	2026-08-06 14:22:56.916	2026-08-06 14:22:56.916	\N	RDM005
PEV015	USR004	\N	\N	60	RECYCLING_APPROVED	SENT	2026-08-06 14:29:28.439	\N	\N	2026-08-06 14:29:28.439	2026-08-06 14:29:28.439	RCS008	\N
PEV017	USR003	\N	\N	125	RECYCLING_APPROVED	SENT	2026-08-06 14:40:59.729	\N	\N	2026-08-06 14:40:59.74	2026-08-06 14:40:59.74	RCS002	\N
PEV018	USR004	\N	\N	60	RECYCLING_APPROVED	SENT	2026-08-06 14:47:07.149	\N	\N	2026-08-06 14:47:07.16	2026-08-06 14:47:07.16	RCS009	\N
PEV019	USR011	\N	\N	54	RECYCLING_APPROVED	SENT	2026-08-06 15:00:08.244	\N	\N	2026-08-06 15:00:08.256	2026-08-06 15:00:08.256	RCS010	\N
PEV020	USR011	MIS001	SUB007	25	MISSION_COMPLETED	SENT	2026-08-06 15:08:24.193	\N	\N	2026-08-06 15:08:24.194	2026-08-06 15:08:24.194	\N	\N
PEV022	USR002	MIS004	SUB012	20	MISSION_COMPLETED	SENT	2026-08-06 16:18:53.756	\N	\N	2026-08-06 16:18:53.846	2026-08-06 16:18:53.846	\N	\N
PEV023	USR003	\N	\N	-100	REWARD_REDEEMED	SENT	2026-08-06 16:22:16.297	\N	\N	2026-08-06 16:22:16.543	2026-08-06 16:22:16.543	\N	RDM006
PEV024	USR003	\N	\N	-30	REWARD_REDEEMED	SENT	2026-08-06 16:44:53.395	\N	\N	2026-08-06 16:44:53.455	2026-08-06 16:44:53.455	\N	RDM007
PEV025	USR003	\N	\N	30	REWARD_REFUNDED	SENT	2026-08-07 00:56:46.94	\N	\N	2026-08-07 00:56:46.94	2026-08-07 00:56:46.94	\N	RDM007
PEV027	USR003	\N	\N	-10	REWARD_REDEEMED	SENT	2026-08-06 16:59:04.344	\N	\N	2026-08-06 16:59:04.391	2026-08-06 16:59:04.391	\N	RDM008
PEV028	USR003	\N	\N	10	REWARD_REFUNDED	SENT	2026-08-07 00:59:37.157	\N	\N	2026-08-07 00:59:37.157	2026-08-07 00:59:37.157	\N	RDM008
PEV031	USR012	\N	\N	120	RECYCLING_APPROVED	SENT	2026-08-07 02:06:12.227	\N	\N	2026-08-07 02:06:12.319	2026-08-07 02:06:12.319	RCS013	\N
PEV032	USR012	MIS003	SUB013	50	MISSION_COMPLETED	SENT	2026-08-07 02:09:09.74	\N	\N	2026-08-07 02:09:09.857	2026-08-07 02:09:09.857	\N	\N
PEV033	USR013	MIS004	SUB016	20	MISSION_COMPLETED	SENT	2026-08-09 12:59:22.619	\N	\N	2026-08-09 12:59:22.644	2026-08-09 12:59:22.644	\N	\N
PEV034	USR013	\N	\N	100	RECYCLING_APPROVED	SENT	2026-08-09 13:01:34.217	\N	\N	2026-08-09 13:01:34.23	2026-08-09 13:01:34.23	RCS015	\N
PEV035	USR011	\N	\N	75	RECYCLING_APPROVED	SENT	2026-08-09 14:18:52.563	\N	\N	2026-08-09 14:18:53	2026-08-09 14:18:53	RCS016	\N
PEV036	USR011	MIS004	SUB022	20	MISSION_COMPLETED	SENT	2026-08-10 04:53:50.982	\N	\N	2026-08-10 04:53:51.011	2026-08-10 04:53:51.011	\N	\N
PEV037	USR014	MIS004	SUB024	20	MISSION_COMPLETED	SENT	2026-08-10 05:09:18.434	\N	\N	2026-08-10 05:09:18.435	2026-08-10 05:09:18.435	\N	\N
PEV039	USR014	\N	\N	120	RECYCLING_APPROVED	SENT	2026-08-10 07:45:09.182	\N	\N	2026-08-10 07:45:09.191	2026-08-10 07:45:09.191	RCS017	\N
PEV040	USR011	\N	\N	120	RECYCLING_APPROVED	SENT	2026-08-10 13:34:59.015	\N	\N	2026-08-10 13:34:59.03	2026-08-10 13:34:59.03	RCS018	\N
PEV041	USR002	\N	\N	50	RECYCLING_APPROVED	SENT	2026-08-11 03:40:31.986	\N	\N	2026-08-11 03:40:31.999	2026-08-11 03:40:31.999	RCS019	\N
PEV042	USR016	MIS004	SUB031	20	MISSION_COMPLETED	SENT	2026-08-11 03:53:13.73	\N	\N	2026-08-11 03:53:13.735	2026-08-11 03:53:13.735	\N	\N
PEV043	USR017	\N	\N	40	RECYCLING_APPROVED	SENT	2026-08-11 03:55:16.403	\N	\N	2026-08-11 03:55:16.417	2026-08-11 03:55:16.417	RCS020	\N
PEV044	USR017	\N	\N	78	RECYCLING_APPROVED	SENT	2026-08-11 03:58:13.184	\N	\N	2026-08-11 03:58:13.201	2026-08-11 03:58:13.201	RCS022	\N
PEV045	USR017	\N	\N	-80	REWARD_REDEEMED	SENT	2026-08-11 03:58:46.848	\N	\N	2026-08-11 03:58:46.989	2026-08-11 03:58:46.989	\N	RDM009
PEV046	USR016	\N	\N	20	RECYCLING_APPROVED	SENT	2026-08-11 04:06:43.132	\N	\N	2026-08-11 04:06:43.147	2026-08-11 04:06:43.147	RCS023	\N
PEV047	USR019	\N	\N	10	RECYCLING_APPROVED	SENT	2026-08-11 06:04:44.184	\N	\N	2026-08-11 06:04:44.192	2026-08-11 06:04:44.192	RCS024	\N
PEV048	USR011	MIS003	SUB020	50	MISSION_COMPLETED	SENT	2026-08-11 09:16:29.943	\N	\N	2026-08-11 09:16:29.964	2026-08-11 09:16:29.964	\N	\N
PEV049	USR019	MIS003	SUB036	50	MISSION_COMPLETED	SENT	2026-08-11 09:18:36.625	\N	\N	2026-08-11 09:18:36.682	2026-08-11 09:18:36.682	\N	\N
PEV050	USR015	MIS003	SUB037	50	MISSION_COMPLETED	SENT	2026-08-11 09:48:53.451	\N	\N	2026-08-11 09:48:53.546	2026-08-11 09:48:53.546	\N	\N
\.


--
-- Data for Name: Quiz; Type: TABLE DATA; Schema: public; Owner: sdgadmin
--

COPY public."Quiz" (id, "contentId", slug, title, "passingScore", "createdAt", "updatedAt") FROM stdin;
QZ001	CNT001	plastic-recycling-basics-quiz	Plastic Recycling Basics Quiz	4	2026-08-06 09:44:42.357	2026-08-06 09:44:42.357
QZ002	CNT002	paper-recycling-essentials-quiz	Paper Recycling Essentials Quiz	4	2026-08-06 09:44:42.377	2026-08-06 09:44:42.377
QZ003	CNT003	e-waste-recycling-awareness-quiz	E-Waste Recycling Awareness Quiz	4	2026-08-06 09:44:42.392	2026-08-06 09:44:42.392
\.


--
-- Data for Name: QuizAttempt; Type: TABLE DATA; Schema: public; Owner: sdgadmin
--

COPY public."QuizAttempt" (id, "quizId", "userId", score, "totalQuestions", "correctAnswers", passed, answers, "attemptedAt", "timeSpentSeconds") FROM stdin;
QAT001	QZ001	USR003	3	5	3	f	{"QQ0011": "PVC", "QQ0012": "Empty and rinse it", "QQ0013": "It reduces contamination", "QQ0014": "PVC film", "QQ0015": "The batch quality drops"}	2026-08-06 11:40:38.408	98
QAT002	QZ001	USR002	1	5	1	f	{"QQ0011": "PET"}	2026-08-06 14:22:46.524	72
QAT005	QZ003	USR011	2	5	2	f	{"QQ0031": "It may contain hazardous materials", "QQ0032": "Crush them first", "QQ0033": "Clean cardboard", "QQ0034": "They handle electronics safely", "QQ0035": "Ignore batteries"}	2026-08-06 15:09:54.449	27
QAT006	QZ001	USR014	1	5	1	f	{"QQ0011": "PVC", "QQ0012": "Leave liquid inside", "QQ0013": "It reduces contamination", "QQ0014": "Polystyrene Foam", "QQ0015": "The item gains more value"}	2026-08-09 13:41:50.492	13
QAT007	QZ003	USR014	5	5	5	t	{"QQ0031": "It may contain hazardous materials", "QQ0032": "Tape the terminals", "QQ0033": "Old charger", "QQ0034": "They handle electronics safely", "QQ0035": "Use approved drop-off points"}	2026-08-10 05:18:17.407	44
QAT008	QZ001	USR014	1	5	1	f	{"QQ0011": "PET"}	2026-08-10 07:45:05.945	60
QAT009	QZ001	USR011	1	5	1	f	{"QQ0011": "PET"}	2026-08-10 13:34:08.271	60
QAT010	QZ003	USR016	5	5	5	t	{"QQ0031": "It may contain hazardous materials", "QQ0032": "Tape the terminals", "QQ0033": "Old charger", "QQ0034": "They handle electronics safely", "QQ0035": "Use approved drop-off points"}	2026-08-11 03:41:10.675	78
QAT011	QZ003	USR016	0	5	0	f	{"QQ0011": "PET"}	2026-08-11 03:56:00.184	60
\.


--
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
-- Data for Name: RecyclingQrCode; Type: TABLE DATA; Schema: public; Owner: sdgadmin
--

COPY public."RecyclingQrCode" (id, nonce, signature, status, "expiresAt", "issuedById", "claimedById", "claimedAt", "invalidatedById", "invalidatedAt", "materialType", "estimatedWeightKg", payload, "createdAt", "updatedAt") FROM stdin;
QR001	ca40967e2462170cc6840f280f60a723	008c75bca17b24930bf0b29c0b078addbdd4a6644f7323313e0c319f9c8bc446	ISSUED	2026-09-05 09:44:42.689	USR001	\N	\N	\N	\N	Metal	1.5	{"qrId": "QR001", "type": "recycling-deposit", "nonce": "ca40967e2462170cc6840f280f60a723", "expiresAt": "2026-09-05T09:44:42.689Z", "materialType": "Metal", "estimatedWeightKg": 1.5}	2026-08-06 09:44:42.692	2026-08-06 09:44:42.692
QR002	e59bb311f33b0d61fa9c01d090482990	9923a9e0809839e96676d7c6e7f8caf7b2bedfc41f5211b11891c1771b80c34b	CLAIMED	2026-09-05 09:44:42.689	USR001	USR003	2026-08-06 09:44:42.714	\N	\N	Plastic	2.5	{"qrId": "QR002", "type": "recycling-deposit", "nonce": "e59bb311f33b0d61fa9c01d090482990", "expiresAt": "2026-09-05T09:44:42.689Z", "materialType": "Plastic", "estimatedWeightKg": 2.5}	2026-08-06 09:44:42.715	2026-08-06 09:44:42.715
QR004	f9faa25e9b9c41e152c16e90207f1464	b3f43a4886ce76b21ee6cdcff2c397375a59382a52860d95cfd806e54caa0a5c	INVALIDATED	2026-08-06 15:22:54.609	USR001	\N	\N	USR001	2026-08-06 14:22:54.764	Glass	1	{"qrId": "QR004", "type": "recycling-deposit", "nonce": "f9faa25e9b9c41e152c16e90207f1464", "expiresAt": "2026-08-06T15:22:54.609Z", "materialType": "Glass", "estimatedWeightKg": 1}	2026-08-06 14:22:54.617	2026-08-06 14:22:54.766
QR007	1dc2ef0dccfb66812d7ff02adfa60d09	4be2e2bad71b040ff0dc2493ed3bc508047bf54f7a4a5d4fffd5f59e84ff9e9d	CLAIMED	2026-08-07 04:33:09.672	USR001	USR003	2026-08-07 03:42:38.385	\N	\N	Plastic	1.2	{"qrId": "QR007", "type": "recycling-deposit", "nonce": "1dc2ef0dccfb66812d7ff02adfa60d09", "expiresAt": "2026-08-07T04:33:09.672Z", "materialType": "Plastic", "estimatedWeightKg": 1.2}	2026-08-07 03:33:09.774	2026-08-07 03:42:38.387
QR003	b6c76bc7543a5fa13a7f3da2b2e3fe0e	4f32caa6abceecdd18c687ab8dd4701eb67fd9d5925e00160729e1642368574f	EXPIRED	2026-08-06 15:22:53.018	USR001	\N	\N	\N	\N	Plastic	2	{"qrId": "QR003", "type": "recycling-deposit", "nonce": "b6c76bc7543a5fa13a7f3da2b2e3fe0e", "expiresAt": "2026-08-06T15:22:53.018Z", "materialType": "Plastic", "estimatedWeightKg": 2}	2026-08-06 14:22:53.043	2026-08-09 12:57:22.233
QR005	8ae2e79036a88d23d52d33013ad64afd	41cb4a72afe60e4706a946a2ac9fef38f5bda0745aa7b15f953de7c42e4c998c	EXPIRED	2026-08-06 18:31:07.673	USR001	\N	\N	\N	\N	PAPER	0.5	{"qrId": "QR005", "type": "recycling-deposit", "nonce": "8ae2e79036a88d23d52d33013ad64afd", "expiresAt": "2026-08-06T18:31:07.673Z", "materialType": "PAPER", "estimatedWeightKg": 0.5}	2026-08-06 18:21:07.686	2026-08-09 12:57:22.233
QR006	36657cb03dd71f25526c06794a17848d	ea3486810a5f9faa6c2f8de2cfdef3bdac0f240d77df73b291d6ce44e53b002b	EXPIRED	2026-08-06 18:44:41.878	USR001	\N	\N	\N	\N	PAPER	1	{"qrId": "QR006", "type": "recycling-deposit", "nonce": "36657cb03dd71f25526c06794a17848d", "expiresAt": "2026-08-06T18:44:41.878Z", "materialType": "PAPER", "estimatedWeightKg": 1}	2026-08-06 18:34:42.005	2026-08-09 12:57:22.233
QR008	f8d71d9f853bdcb5d0031e01c072ce29	57c8a6d31134217d0e6b2de2e34413b4a7e552da251f0dcdaa5a833ff4e62a61	CLAIMED	2026-08-09 13:57:40.851	USR001	USR013	2026-08-09 13:00:10.229	\N	\N	Plastic	2	{"qrId": "QR008", "type": "recycling-deposit", "nonce": "f8d71d9f853bdcb5d0031e01c072ce29", "expiresAt": "2026-08-09T13:57:40.851Z", "materialType": "Plastic", "estimatedWeightKg": 2}	2026-08-09 12:57:41.458	2026-08-09 13:00:10.23
QR009	e345e0888ecbecf72a2e59c2fa286553	07b7c8ede8b3d8f0d5ed1f53d6c9439edf20336ec5cec8b3ff567bb268068210	CLAIMED	2026-08-09 14:20:28.334	USR001	USR011	2026-08-09 14:16:29.42	\N	\N	Glass	2.5	{"qrId": "QR009", "type": "recycling-deposit", "nonce": "e345e0888ecbecf72a2e59c2fa286553", "expiresAt": "2026-08-09T14:20:28.334Z", "materialType": "Glass", "estimatedWeightKg": 2.5}	2026-08-09 14:15:28.514	2026-08-09 14:16:29.421
QR010	8d8b1991b5b987e10851998ad7c1025a	1ab133a674ca809d1b07eb6a4798816dbdab2164e5413141cbaf42f813fe2eee	CLAIMED	2026-08-11 04:35:10.509	USR001	USR002	2026-08-11 03:40:06.258	\N	\N	Plastic	1	{"qrId": "QR010", "type": "recycling-deposit", "nonce": "8d8b1991b5b987e10851998ad7c1025a", "expiresAt": "2026-08-11T04:35:10.509Z", "materialType": "Plastic", "estimatedWeightKg": 1}	2026-08-11 03:35:10.529	2026-08-11 03:40:06.26
QR011	0536172ca62265c1627d264ec846cd5d	f8efea8782e14d604f550402b07fbf0c5485544cedb01af60bea40fad9fdb34b	CLAIMED	2026-08-11 04:54:28.637	USR001	USR017	2026-08-11 03:54:41.106	\N	\N	Paper	2	{"qrId": "QR011", "type": "recycling-deposit", "nonce": "0536172ca62265c1627d264ec846cd5d", "expiresAt": "2026-08-11T04:54:28.637Z", "materialType": "Paper", "estimatedWeightKg": 2}	2026-08-11 03:54:28.695	2026-08-11 03:54:41.108
QR012	a48bd8ccb74cc87242461fd6d7af24be	d3634273e1328cbc1b610d52fd92d81aac92e85711796f2ed823f13f00ce1f74	ISSUED	2026-08-11 07:02:11.518	USR001	\N	\N	\N	\N	Plastic	0.1	{"qrId": "QR012", "type": "recycling-deposit", "nonce": "a48bd8ccb74cc87242461fd6d7af24be", "expiresAt": "2026-08-11T07:02:11.518Z", "materialType": "Plastic", "estimatedWeightKg": 0.1}	2026-08-11 06:02:11.596	2026-08-11 06:02:11.596
QR013	b6e9b8e74ff9eab40a15d4ecf12fdf5e	5122854866da7f81e1d178d7849cfe6c1b6b521f1a2bfba4734ef58a5ad65c58	CLAIMED	2026-08-11 07:03:44.716	USR001	USR019	2026-08-11 06:04:26.038	\N	\N	Paper	0.5	{"qrId": "QR013", "type": "recycling-deposit", "nonce": "b6e9b8e74ff9eab40a15d4ecf12fdf5e", "expiresAt": "2026-08-11T07:03:44.716Z", "materialType": "Paper", "estimatedWeightKg": 0.5}	2026-08-11 06:03:44.808	2026-08-11 06:04:26.039
\.


--
-- Data for Name: RecyclingSubmission; Type: TABLE DATA; Schema: public; Owner: sdgadmin
--

COPY public."RecyclingSubmission" (id, "userId", source, "qrCodeId", "materialType", quantity, "proofImageUrl", status, "pointsAwarded", "isDuplicateFlagged", "reviewNote", "reviewedById", "submittedAt", "reviewedAt") FROM stdin;
RCS001	USR002	MANUAL	\N	Paper	35	\N	APPROVED	700	f	\N	USR001	2026-08-06 09:44:42.73	2026-08-06 09:44:42.729
RCS003	USR004	MANUAL	\N	Paper	2.6	\N	APPROVED	52	f	Approved after evidence review.	USR001	2026-08-06 09:53:52.597	2026-08-06 09:58:12.098
RCS004	USR002	MANUAL	\N	Plastic	5	https://stsdguploads.blob.core.windows.net/recycling-proofs/USR002/1786014471415-recycling-proof-1786014468406jpg	APPROVED	250	f	\N	\N	2026-08-06 11:07:51.936	2026-08-06 19:15:00.328
RCS005	USR002	MANUAL	\N	Glass	1	https://stsdguploads.blob.core.windows.net/recycling-proofs/USR002/1786015389213-recycling-proof-1786015386546jpg	APPROVED	30	f	\N	\N	2026-08-06 11:23:09.746	2026-08-06 19:24:38.719
RCS006	USR004	MANUAL	\N	Paper	3	\N	PENDING_REVIEW	0	f	\N	\N	2026-08-06 14:22:54.018	\N
RCS008	USR004	MANUAL	\N	Paper	3	\N	APPROVED	60	f	\N	\N	2026-08-06 14:28:11.192	2026-08-06 14:29:28.439
RCS012	USR003	MANUAL	\N	Plastic	2	https://stsdguploads.blob.core.windows.net/recycling-proofs/USR003/1786034575824-recycling-proof-1786034574889jpg	PENDING_REVIEW	0	f	\N	\N	2026-08-06 16:42:56.035	\N
RCS015	USR013	QR	QR008	Plastic	2	\N	APPROVED	100	f	\N	USR001	2026-08-09 13:00:10.367	2026-08-09 13:01:34.217
RCS016	USR011	QR	QR009	Glass	2.5	\N	APPROVED	75	f	\N	USR001	2026-08-09 14:16:29.436	2026-08-09 14:18:52.563
RCS002	USR003	QR	QR002	Plastic	2.5	\N	APPROVED	125	f	\N	USR001	2026-08-06 09:44:42.759	2026-08-06 14:40:59.729
RCS009	USR004	MANUAL	\N	Paper	3	\N	APPROVED	60	f	\N	USR001	2026-08-06 14:46:08.537	2026-08-06 14:47:07.149
RCS010	USR011	MANUAL	\N	Paper	2.7	https://stsdguploads.blob.core.windows.net/recycling-proofs/USR011/1786028363010-recycling-proof-1786028358569jpg	APPROVED	54	f	\N	USR001	2026-08-06 14:59:23.49	2026-08-06 15:00:08.244
RCS013	USR012	MANUAL	\N	Plastic	2.4	https://stsdguploads.blob.core.windows.net/recycling-proofs/USR012/1786068286434-recycling-proof-1786068270015jpg	APPROVED	120	f	\N	USR001	2026-08-07 02:04:47.529	2026-08-07 02:06:12.227
RCS014	USR003	QR	QR007	Plastic	1.2	\N	REJECTED	0	f	\N	USR001	2026-08-07 03:42:38.496	2026-08-09 14:26:30.942
RCS017	USR014	MANUAL	\N	Metal	2	\N	APPROVED	120	f	Approved during UAT data-integrity recycling flow.	USR001	2026-08-10 07:45:08.976	2026-08-10 07:45:09.182
RCS018	USR011	MANUAL	\N	Metal	2	\N	APPROVED	120	f	Approved during UAT data-integrity recycling flow.	USR001	2026-08-10 13:34:50.445	2026-08-10 13:34:59.015
RCS019	USR002	QR	QR010	Plastic	1	\N	APPROVED	50	f	\N	USR001	2026-08-11 03:40:06.274	2026-08-11 03:40:31.986
RCS020	USR017	QR	QR011	Paper	2	\N	APPROVED	40	f	\N	USR001	2026-08-11 03:54:41.117	2026-08-11 03:55:16.403
RCS021	USR002	MANUAL	\N	Plastic	5	https://stsdguploads.blob.core.windows.net/recycling-proofs/USR002/1786420637167-recycling-proof-1786420634594jpg	PENDING_REVIEW	0	f	\N	\N	2026-08-11 03:57:17.925	\N
RCS022	USR017	MANUAL	\N	Glass	2.6	https://stsdguploads.blob.core.windows.net/recycling-proofs/USR017/1786420668930-recycling-proof-1786421576705jpg	APPROVED	78	f	\N	USR001	2026-08-11 03:57:49.17	2026-08-11 03:58:13.184
RCS023	USR016	MANUAL	\N	Paper	1	https://stsdguploads.blob.core.windows.net/recycling-proofs/USR016/1786421170514-recycling-proof-1786421169986jpg	APPROVED	20	f	\N	USR001	2026-08-11 04:06:10.978	2026-08-11 04:06:43.132
RCS024	USR019	QR	QR013	Paper	0.5	\N	APPROVED	10	f	\N	USR001	2026-08-11 06:04:26.071	2026-08-11 06:04:44.184
\.


--
-- Data for Name: Redemption; Type: TABLE DATA; Schema: public; Owner: sdgadmin
--

COPY public."Redemption" (id, "userId", "rewardId", "itemName", quantity, "pointsSpent", status, "reservedAt", "expiresAt", "completedAt", "cancelledAt", "cancelReason", "createdAt") FROM stdin;
RDM001	USR002	RWD001	Reusable Coffee Cup Voucher	1	100	RESERVED	2026-08-06 09:44:42.769	2026-09-05 09:44:42.769	\N	\N	\N	2026-08-06 09:44:42.77
RDM002	USR002	RWD001	Reusable Coffee Cup Voucher	1	100	COMPLETED	2026-08-04 09:44:42.769	\N	2026-08-06 09:44:42.769	\N	\N	2026-08-06 09:44:42.783
RDM003	USR002	RWD001	Reusable Coffee Cup Voucher	1	100	COMPLETED	2026-08-06 14:22:55.677	2026-09-05 14:22:55.677	2026-08-06 14:22:56.239	\N	\N	2026-08-06 14:22:55.714
RDM004	USR002	RWD002	Campus Cafe RM5 Voucher	1	300	CANCELLED	2026-08-06 14:22:56.388	2026-09-05 14:22:56.388	\N	2026-08-06 14:22:56.609	Changed my mind.	2026-08-06 14:22:56.4
RDM005	USR002	RWD003	Eco Starter Kit	1	600	RESERVED	2026-08-06 14:22:56.885	2026-09-05 14:22:56.885	\N	\N	\N	2026-08-06 14:22:56.902
RDM006	USR003	RWD001	Reusable Coffee Cup Voucher	1	100	CANCELLED	2026-08-06 16:22:16.297	2026-09-05 16:22:16.297	\N	\N	\N	2026-08-06 16:22:16.454
RDM007	USR003	RWD004	Reusable Water Bottle x2	2	30	CANCELLED	2026-08-06 16:44:53.395	2026-09-05 16:44:53.395	\N	2026-08-07 00:56:46.94	\N	2026-08-06 16:44:53.416
RDM008	USR003	RWD003	Eco Starter Kit	1	10	CANCELLED	2026-08-06 16:59:04.344	2026-09-05 16:59:04.344	\N	2026-08-07 00:59:37.157	\N	2026-08-06 16:59:04.365
RDM009	USR017	RWD015	Drumstick Toy	1	80	RESERVED	2026-08-11 03:58:46.848	2026-09-10 03:58:46.848	\N	\N	\N	2026-08-11 03:58:46.96
\.


--
-- Data for Name: RedemptionCooldown; Type: TABLE DATA; Schema: public; Owner: sdgadmin
--

COPY public."RedemptionCooldown" (id, "userId", "rewardId", "lastRedeemedAt", "countToday", "countWeek") FROM stdin;
RDC001	USR002	RWD001	2026-08-06 14:22:55.677	1	1
RDC002	USR002	RWD002	2026-08-06 14:22:56.388	1	1
RDC003	USR002	RWD003	2026-08-06 14:22:56.885	1	1
RDC004	USR003	RWD001	2026-08-06 16:22:16.297	1	1
RDC005	USR003	RWD004	2026-08-06 16:44:53.395	2	2
RDC006	USR003	RWD003	2026-08-06 16:59:04.344	1	1
RDC007	USR017	RWD015	2026-08-11 03:58:46.848	1	1
\.


--
-- Data for Name: Reward; Type: TABLE DATA; Schema: public; Owner: sdgadmin
--

COPY public."Reward" (id, name, "pointsRequired", stock, "imageUrl", "imageUploadId", category, "expiresAt", "isActive", tier, "createdAt") FROM stdin;
RWD013	Coffee Bottle	180	2	https://stsdguploads.blob.core.windows.net/reward-images/USR001/1786255292869-coffee-bottlejpg	UPL026	Drinkware	\N	t	medium	2026-08-09 13:53:14.705
RWD016	Sticker	40	4	https://stsdguploads.blob.core.windows.net/reward-images/USR001/1786255351496-stickerjpg	UPL029	Stationery	\N	t	small	2026-08-09 13:53:14.705
RWD014	Sonic Mask	60	1	http://sdg-bff-amg4hcgtemhkadcr.southeastasia-01.azurewebsites.net/uploads/rewards/1786281402047-screenshot-2026-08-09-211627.png	UPL027	Accessory	\N	t	small	2026-08-09 13:53:14.705
RWD018	Bookmark	35	6	https://stsdguploads.blob.core.windows.net/reward-images/USR001/1786255393370-bookmarkjpg	UPL031	Stationery	\N	t	small	2026-08-09 13:53:14.705
RWD012	USB Mini Fan	150	1	http://sdg-bff-amg4hcgtemhkadcr.southeastasia-01.azurewebsites.net/uploads/rewards/1786281578942-screenshot-2026-08-09-211921.png	UPL025	Gadget	\N	t	medium	2026-08-09 13:53:14.705
RWD021	Phone Key Ring Holder	70	1	https://stsdguploads.blob.core.windows.net/reward-images/USR001/1786255450412-phone-key-ring-holderjpg	UPL034	Accessory	\N	t	small	2026-08-09 13:53:14.705
RWD022	UOW Kangaroo Plushie	350	1	https://stsdguploads.blob.core.windows.net/reward-images/USR001/1786255474381-uow-kangaroo-plushiejpg	UPL035	Collectible	\N	t	large	2026-08-09 13:53:14.705
RWD002	Campus Cafe RM5 Voucher	300	20	https://upload.wikimedia.org/wikipedia/commons/e/e0/PlaceholderLC.png	\N	Food	\N	f	medium	2026-08-06 09:44:42.527
RWD003	Eco Starter Kit	300	9	https://upload.wikimedia.org/wikipedia/commons/e/e0/PlaceholderLC.png	\N	Eco Gear	\N	t	large	2026-08-06 09:44:42.531
RWD020	Hershey's Creamy Milk Chocolate	120	1	https://stsdguploads.blob.core.windows.net/reward-images/USR001/1786255431434-heysheys-creamy-milk-chocolatejpg	UPL033	Snack	\N	t	small	2026-08-09 13:53:14.705
RWD011	Bolt Studio Shirt (2XL)	240	1	http://sdg-bff-amg4hcgtemhkadcr.southeastasia-01.azurewebsites.net/uploads/rewards/1786280978135-screenshot-2026-08-09-210901.png	UPL024	Apparel	\N	t	large	2026-08-09 13:53:14.705
RWD005	Badges	50	6	http://sdg-bff-amg4hcgtemhkadcr.southeastasia-01.azurewebsites.net/uploads/rewards/1786281694178-screenshot-2026-08-09-212124.png	UPL017	Collectible	\N	t	small	2026-08-09 13:53:14.705
RWD004	Notebook	40	29	http://sdg-bff-amg4hcgtemhkadcr.southeastasia-01.azurewebsites.net/uploads/rewards/1786281509392-screenshot-2026-08-09-211802.png	UPL015	Stationery	\N	t	small	2026-08-06 14:22:55.34
RWD001	Reusable Coffee Cup Voucher	300	28	http://sdg-bff-amg4hcgtemhkadcr.southeastasia-01.azurewebsites.net/uploads/rewards/1786281728925-screenshot-2026-08-09-212202.png	\N	Lifestyle	\N	f	small	2026-08-06 09:44:42.517
RWD010	Tiger Pattern Shirt (XL)	240	1	https://stsdguploads.blob.core.windows.net/reward-images/USR001/1786255244102-tiger-pattern-shirt-xljpg?sv=2026-04-06&st=2026-08-09T13%3A01%3A02Z&se=2026-08-09T14%3A06%3A02Z&sr=b&sp=r&sig=0nQXSozOQvgi2erbPBptSM%2FxeqqyvG0r9mWd99UGwb8%3D	UPL023	Apparel	\N	t	large	2026-08-09 13:53:14.705
RWD023	Nippon Paint Keychain	50	22	https://stsdguploads.blob.core.windows.net/reward-images/USR001/1786426767642-nippon-paintjpeg	UPL049	Accessory	\N	t	small	2026-08-11 13:37:30.313
RWD019	Keychain Hanger	60	3	https://stsdguploads.blob.core.windows.net/reward-images/USR001/1786255412513-keychain-hangerjpg?sv=2026-04-06&st=2026-08-09T12%3A50%3A10Z&se=2026-08-09T13%3A55%3A10Z&sr=b&sp=r&sig=xqDZVRP8NbJT5lQGmgrv37Bhh5NH86bvO1DnDO5i84s%3D	UPL032	Accessory	\N	t	small	2026-08-09 13:53:14.705
RWD017	Card Holder Leash	70	3	https://stsdguploads.blob.core.windows.net/reward-images/USR001/1786255369555-card-holder-leashjpg?sv=2026-04-06&st=2026-08-09T12%3A50%3A10Z&se=2026-08-09T13%3A55%3A10Z&sr=b&sp=r&sig=mrvecuQMDCoCS6RFIOZ61apKwSPmgTCR4Vg0aXYHfLI%3D	UPL030	Accessory	\N	t	small	2026-08-09 13:53:14.705
RWD015	Drumstick Toy	80	2	http://sdg-bff-amg4hcgtemhkadcr.southeastasia-01.azurewebsites.net/uploads/rewards/1786281461467-screenshot-2026-08-09-211726.png	UPL028	Toy	\N	t	small	2026-08-09 13:53:14.705
RWD008	Tote Bag	120	1	http://sdg-bff-amg4hcgtemhkadcr.southeastasia-01.azurewebsites.net/uploads/rewards/1786281652214-screenshot-2026-08-09-212040.png	UPL020	Bag	\N	t	medium	2026-08-09 13:53:14.705
RWD009	EA Sport Handcarry Bag	280	1	http://sdg-bff-amg4hcgtemhkadcr.southeastasia-01.azurewebsites.net/uploads/rewards/1786281337845-screenshot-2026-08-09-211455.png	UPL022	Bag	\N	t	large	2026-08-09 13:53:14.705
RWD006	Code for Malaysia Shirt (L)	250	2	https://stsdguploads.blob.core.windows.net/reward-images/USR001/1786255126986-microsoft-shirt-ljpg?sv=2026-04-06&st=2026-08-09T13%3A06%3A40Z&se=2026-08-09T14%3A11%3A40Z&sr=b&sp=r&sig=HgME7usB58knFjMEJOFwhweUg%2BwALY9Te%2BhxcEjrWIg%3D	UPL018	Apparel	\N	t	large	2026-08-09 13:53:14.705
RWD007	Code for Malaysia Shirt (M)	250	3	http://sdg-bff-amg4hcgtemhkadcr.southeastasia-01.azurewebsites.net/uploads/rewards/1786281236625-screenshot-2026-08-09-211223.png	UPL021	Apparel	\N	t	large	2026-08-09 13:53:14.705
\.


--
-- Data for Name: RewardTier; Type: TABLE DATA; Schema: public; Owner: sdgadmin
--

COPY public."RewardTier" (tier, "pointsRequired") FROM stdin;
small	100
medium	300
large	600
\.


--
-- Data for Name: SuspiciousActivityLog; Type: TABLE DATA; Schema: public; Owner: sdgadmin
--

COPY public."SuspiciousActivityLog" (id, "userId", "activityType", severity, details, "detectedAt") FROM stdin;
SAL001	USR002	qr_invalid_signature	high	{"payload":{"qrId":"QR001","nonce":"not-a-real-nonce","type":"recycling-deposit","materialType":"Plastic","estimatedWeightKg":1,"expiresAt":"2035-01-01T00:00:00.000Z"}}	2026-08-06 14:22:52.218
\.


--
-- Data for Name: UploadedFile; Type: TABLE DATA; Schema: public; Owner: sdgadmin
--

COPY public."UploadedFile" (id, "userId", "missionSubmissionId", "containerName", "blobName", "fileUrl", "mimeType", "fileSize", purpose, "createdAt", "recyclingSubmissionId", "rewardId") FROM stdin;
UPL001	USR002	\N	recycling-proofs	USR002/1786014471415-recycling-proof-1786014468406jpg	https://stsdguploads.blob.core.windows.net/recycling-proofs/USR002/1786014471415-recycling-proof-1786014468406jpg	image/jpeg	2792692	RECYCLING_PROOF	2026-08-06 11:07:51.581	RCS004	\N
UPL002	USR002	\N	recycling-proofs	USR002/1786015389213-recycling-proof-1786015386546jpg	https://stsdguploads.blob.core.windows.net/recycling-proofs/USR002/1786015389213-recycling-proof-1786015386546jpg	image/jpeg	12370	RECYCLING_PROOF	2026-08-06 11:23:09.313	RCS005	\N
UPL003	USR002	SUB004	mission-proofs	USR002/1786015518002-mission-proofjpg	https://stsdguploads.blob.core.windows.net/mission-proofs/USR002/1786015518002-mission-proofjpg	image/jpeg	11385	MISSION_PROOF	2026-08-06 11:25:18.031	\N	\N
UPL004	USR002	\N	recycling-proofs	USR002/1786016113810-recycling-proof-1786016111073jpg	https://stsdguploads.blob.core.windows.net/recycling-proofs/USR002/1786016113810-recycling-proof-1786016111073jpg	image/jpeg	2792692	RECYCLING_PROOF	2026-08-06 11:35:14.057	\N	\N
UPL005	USR011	\N	recycling-proofs	USR011/1786028363010-recycling-proof-1786028358569jpg	https://stsdguploads.blob.core.windows.net/recycling-proofs/USR011/1786028363010-recycling-proof-1786028358569jpg	image/jpeg	30127	RECYCLING_PROOF	2026-08-06 14:59:23.139	RCS010	\N
UPL006	USR011	SUB006	mission-proofs	USR011/1786028542622-mission-proofjpg	https://stsdguploads.blob.core.windows.net/mission-proofs/USR011/1786028542622-mission-proofjpg	image/jpeg	30974	MISSION_PROOF	2026-08-06 15:02:22.653	\N	\N
UPL007	USR011	SUB007	mission-proofs	USR011/1786028883026-mission-proofjpg	https://stsdguploads.blob.core.windows.net/mission-proofs/USR011/1786028883026-mission-proofjpg	image/jpeg	30974	MISSION_PROOF	2026-08-06 15:08:03.3	\N	\N
UPL008	USR002	SUB012	mission-proofs	USR002/1786033133242-mission-proofjpg	https://stsdguploads.blob.core.windows.net/mission-proofs/USR002/1786033133242-mission-proofjpg	image/jpeg	79521	MISSION_PROOF	2026-08-06 16:18:53.402	\N	\N
UPL009	USR003	\N	recycling-proofs	USR003/1786034534287-recycling-proof-1786034532828jpg	https://stsdguploads.blob.core.windows.net/recycling-proofs/USR003/1786034534287-recycling-proof-1786034532828jpg	image/jpeg	16568	RECYCLING_PROOF	2026-08-06 16:42:14.761	\N	\N
UPL010	USR003	\N	recycling-proofs	USR003/1786034570334-recycling-proof-1786034569242jpg	https://stsdguploads.blob.core.windows.net/recycling-proofs/USR003/1786034570334-recycling-proof-1786034569242jpg	image/jpeg	16568	RECYCLING_PROOF	2026-08-06 16:42:50.359	\N	\N
UPL011	USR003	\N	recycling-proofs	USR003/1786034575824-recycling-proof-1786034574889jpg	https://stsdguploads.blob.core.windows.net/recycling-proofs/USR003/1786034575824-recycling-proof-1786034574889jpg	image/jpeg	16568	RECYCLING_PROOF	2026-08-06 16:42:55.846	RCS012	\N
UPL012	USR012	\N	recycling-proofs	USR012/1786068286434-recycling-proof-1786068270015jpg	https://stsdguploads.blob.core.windows.net/recycling-proofs/USR012/1786068286434-recycling-proof-1786068270015jpg	image/jpeg	1887421	RECYCLING_PROOF	2026-08-07 02:04:46.576	RCS013	\N
UPL013	USR012	SUB013	mission-proofs	USR012/1786068498354-mission-proofjpg	https://stsdguploads.blob.core.windows.net/mission-proofs/USR012/1786068498354-mission-proofjpg	image/jpeg	1887421	MISSION_PROOF	2026-08-07 02:08:18.552	\N	\N
UPL014	USR003	SUB014	mission-proofs	USR003/1786072094019-mission-proofjpg	https://stsdguploads.blob.core.windows.net/mission-proofs/USR003/1786072094019-mission-proofjpg	image/jpeg	16256	MISSION_PROOF	2026-08-07 03:08:14.039	\N	\N
UPL015	USR001	\N	reward-images	USR001/1786073134473-notebookjpg	https://stsdguploads.blob.core.windows.net/reward-images/USR001/1786073134473-notebookjpg	image/jpeg	3366607	REWARD_IMAGE	2026-08-07 03:25:34.685	\N	RWD004
UPL016	USR003	SUB015	mission-proofs	USR003/1786076058722-mission-proofjpg	https://stsdguploads.blob.core.windows.net/mission-proofs/USR003/1786076058722-mission-proofjpg	image/jpeg	79521	MISSION_PROOF	2026-08-07 04:14:18.757	\N	\N
UPL017	USR001	\N	reward-images	USR001/1786255103765-badgesjpg	https://stsdguploads.blob.core.windows.net/reward-images/USR001/1786255103765-badgesjpg	image/jpeg	51668	REWARD_IMAGE	2026-08-09 05:58:24.001	\N	RWD005
UPL018	USR001	\N	reward-images	USR001/1786255126986-microsoft-shirt-ljpg	https://stsdguploads.blob.core.windows.net/reward-images/USR001/1786255126986-microsoft-shirt-ljpg	image/jpeg	1665104	REWARD_IMAGE	2026-08-09 05:58:47.129	\N	RWD006
UPL019	USR001	\N	reward-images	USR001/1786255148057-tote-bagjpg	https://stsdguploads.blob.core.windows.net/reward-images/USR001/1786255148057-tote-bagjpg	image/jpeg	3199517	REWARD_IMAGE	2026-08-09 05:59:08.446	\N	RWD007
UPL020	USR001	\N	reward-images	USR001/1786255174015-tote-bagjpg	https://stsdguploads.blob.core.windows.net/reward-images/USR001/1786255174015-tote-bagjpg	image/jpeg	3199517	REWARD_IMAGE	2026-08-09 05:59:34.51	\N	RWD008
UPL021	USR001	\N	reward-images	USR001/1786255192577-microsoft-shirt-mjpg	https://stsdguploads.blob.core.windows.net/reward-images/USR001/1786255192577-microsoft-shirt-mjpg	image/jpeg	1665104	REWARD_IMAGE	2026-08-09 05:59:52.714	\N	RWD007
UPL022	USR001	\N	reward-images	USR001/1786255222454-ea-sport-handcarry-bagjpg	https://stsdguploads.blob.core.windows.net/reward-images/USR001/1786255222454-ea-sport-handcarry-bagjpg	image/jpeg	3150556	REWARD_IMAGE	2026-08-09 06:00:22.6	\N	RWD009
UPL023	USR001	\N	reward-images	USR001/1786255244102-tiger-pattern-shirt-xljpg	https://stsdguploads.blob.core.windows.net/reward-images/USR001/1786255244102-tiger-pattern-shirt-xljpg	image/jpeg	1408410	REWARD_IMAGE	2026-08-09 06:00:44.263	\N	RWD010
UPL024	USR001	\N	reward-images	USR001/1786255259298-bolt-studio-shirt-2xljpg	https://stsdguploads.blob.core.windows.net/reward-images/USR001/1786255259298-bolt-studio-shirt-2xljpg	image/jpeg	1597137	REWARD_IMAGE	2026-08-09 06:00:59.374	\N	RWD011
UPL025	USR001	\N	reward-images	USR001/1786255277264-usb-mini-fanjpg	https://stsdguploads.blob.core.windows.net/reward-images/USR001/1786255277264-usb-mini-fanjpg	image/jpeg	1293663	REWARD_IMAGE	2026-08-09 06:01:17.316	\N	RWD012
UPL026	USR001	\N	reward-images	USR001/1786255292869-coffee-bottlejpg	https://stsdguploads.blob.core.windows.net/reward-images/USR001/1786255292869-coffee-bottlejpg	image/jpeg	2323286	REWARD_IMAGE	2026-08-09 06:01:33.008	\N	RWD013
UPL027	USR001	\N	reward-images	USR001/1786255317746-sonic-maskjpg	https://stsdguploads.blob.core.windows.net/reward-images/USR001/1786255317746-sonic-maskjpg	image/jpeg	1739555	REWARD_IMAGE	2026-08-09 06:01:57.808	\N	RWD014
UPL028	USR001	\N	reward-images	USR001/1786255335323-drumstick-toyjpg	https://stsdguploads.blob.core.windows.net/reward-images/USR001/1786255335323-drumstick-toyjpg	image/jpeg	1867721	REWARD_IMAGE	2026-08-09 06:02:15.558	\N	RWD015
UPL029	USR001	\N	reward-images	USR001/1786255351496-stickerjpg	https://stsdguploads.blob.core.windows.net/reward-images/USR001/1786255351496-stickerjpg	image/jpeg	28544	REWARD_IMAGE	2026-08-09 06:02:31.512	\N	RWD016
UPL030	USR001	\N	reward-images	USR001/1786255369555-card-holder-leashjpg	https://stsdguploads.blob.core.windows.net/reward-images/USR001/1786255369555-card-holder-leashjpg	image/jpeg	56919	REWARD_IMAGE	2026-08-09 06:02:49.574	\N	RWD017
UPL031	USR001	\N	reward-images	USR001/1786255393370-bookmarkjpg	https://stsdguploads.blob.core.windows.net/reward-images/USR001/1786255393370-bookmarkjpg	image/jpeg	1218033	REWARD_IMAGE	2026-08-09 06:03:13.499	\N	RWD018
UPL032	USR001	\N	reward-images	USR001/1786255412513-keychain-hangerjpg	https://stsdguploads.blob.core.windows.net/reward-images/USR001/1786255412513-keychain-hangerjpg	image/jpeg	4271347	REWARD_IMAGE	2026-08-09 06:03:32.733	\N	RWD019
UPL033	USR001	\N	reward-images	USR001/1786255431434-heysheys-creamy-milk-chocolatejpg	https://stsdguploads.blob.core.windows.net/reward-images/USR001/1786255431434-heysheys-creamy-milk-chocolatejpg	image/jpeg	1820083	REWARD_IMAGE	2026-08-09 06:03:51.507	\N	RWD020
UPL034	USR001	\N	reward-images	USR001/1786255450412-phone-key-ring-holderjpg	https://stsdguploads.blob.core.windows.net/reward-images/USR001/1786255450412-phone-key-ring-holderjpg	image/jpeg	2193773	REWARD_IMAGE	2026-08-09 06:04:10.494	\N	RWD021
UPL035	USR001	\N	reward-images	USR001/1786255474381-uow-kangaroo-plushiejpg	https://stsdguploads.blob.core.windows.net/reward-images/USR001/1786255474381-uow-kangaroo-plushiejpg	image/jpeg	3662033	REWARD_IMAGE	2026-08-09 06:04:34.508	\N	RWD022
UPL036	USR013	SUB016	mission-proofs	USR013/1786280362365-qr008png	https://stsdguploads.blob.core.windows.net/mission-proofs/USR013/1786280362365-qr008png	image/png	1539	MISSION_PROOF	2026-08-09 12:59:22.411	\N	\N
UPL037	USR013	SUB017	mission-proofs	USR013/1786280388452-qr008png	https://stsdguploads.blob.core.windows.net/mission-proofs/USR013/1786280388452-qr008png	image/png	1539	MISSION_PROOF	2026-08-09 12:59:48.465	\N	\N
UPL038	USR014	SUB018	mission-proofs	USR014/1786282289533-a6png	https://stsdguploads.blob.core.windows.net/mission-proofs/USR014/1786282289533-a6png	image/png	241066	MISSION_PROOF	2026-08-09 13:31:29.59	\N	\N
UPL039	USR011	SUB022	mission-proofs	USR011/1786337629145-mission-proofjpg	https://stsdguploads.blob.core.windows.net/mission-proofs/USR011/1786337629145-mission-proofjpg	image/jpeg	30974	MISSION_PROOF	2026-08-10 04:53:50.516	\N	\N
UPL040	USR011	SUB023	mission-proofs	USR011/1786337725924-mission-proofjpg	https://stsdguploads.blob.core.windows.net/mission-proofs/USR011/1786337725924-mission-proofjpg	image/jpeg	30974	MISSION_PROOF	2026-08-10 04:55:25.942	\N	\N
UPL041	USR014	SUB024	mission-proofs	USR014/1786338491510-mission-proofjpg	https://stsdguploads.blob.core.windows.net/mission-proofs/USR014/1786338491510-mission-proofjpg	image/jpeg	30974	MISSION_PROOF	2026-08-10 05:08:11.535	\N	\N
UPL042	USR015	SUB028	mission-proofs	USR015/1786369735010-mission-proofjpg	https://stsdguploads.blob.core.windows.net/mission-proofs/USR015/1786369735010-mission-proofjpg	image/jpeg	7935	MISSION_PROOF	2026-08-10 13:48:55.597	\N	\N
UPL043	USR015	SUB029	mission-proofs	USR015/1786370077415-mission-proofjpg	https://stsdguploads.blob.core.windows.net/mission-proofs/USR015/1786370077415-mission-proofjpg	image/jpeg	10891	MISSION_PROOF	2026-08-10 13:54:37.465	\N	\N
UPL044	USR016	SUB031	mission-proofs	USR016/1786419561128-mission-proofjpg	https://stsdguploads.blob.core.windows.net/mission-proofs/USR016/1786419561128-mission-proofjpg	image/jpeg	13770	MISSION_PROOF	2026-08-11 03:39:21.287	\N	\N
UPL045	USR002	\N	recycling-proofs	USR002/1786420637167-recycling-proof-1786420634594jpg	https://stsdguploads.blob.core.windows.net/recycling-proofs/USR002/1786420637167-recycling-proof-1786420634594jpg	image/jpeg	2225260	RECYCLING_PROOF	2026-08-11 03:57:17.363	RCS021	\N
UPL046	USR017	\N	recycling-proofs	USR017/1786420668930-recycling-proof-1786421576705jpg	https://stsdguploads.blob.core.windows.net/recycling-proofs/USR017/1786420668930-recycling-proof-1786421576705jpg	image/jpeg	16290	RECYCLING_PROOF	2026-08-11 03:57:48.952	RCS022	\N
UPL047	USR016	\N	recycling-proofs	USR016/1786421170514-recycling-proof-1786421169986jpg	https://stsdguploads.blob.core.windows.net/recycling-proofs/USR016/1786421170514-recycling-proof-1786421169986jpg	image/jpeg	14680	RECYCLING_PROOF	2026-08-11 04:06:10.627	RCS023	\N
UPL048	USR018	SUB032	mission-proofs	USR018/1786423057891-mission-proofjpg	https://stsdguploads.blob.core.windows.net/mission-proofs/USR018/1786423057891-mission-proofjpg	image/jpeg	16919	MISSION_PROOF	2026-08-11 04:37:37.96	\N	\N
UPL049	USR001	\N	reward-images	USR001/1786426767642-nippon-paintjpeg	https://stsdguploads.blob.core.windows.net/reward-images/USR001/1786426767642-nippon-paintjpeg	image/jpeg	119178	REWARD_IMAGE	2026-08-11 05:39:27.762	\N	RWD023
UPL050	USR019	SUB035	mission-proofs	USR019/1786428145907-mission-proofjpg	https://stsdguploads.blob.core.windows.net/mission-proofs/USR019/1786428145907-mission-proofjpg	image/jpeg	6970	MISSION_PROOF	2026-08-11 06:02:25.966	\N	\N
UPL051	USR011	SUB020	mission-proofs	USR011/1786439789497-mission-proofjpg	https://stsdguploads.blob.core.windows.net/mission-proofs/USR011/1786439789497-mission-proofjpg	image/jpeg	30974	MISSION_PROOF	2026-08-11 09:16:29.698	\N	\N
UPL052	USR015	SUB037	mission-proofs	USR015/1786441733218-mission-proofjpg	https://stsdguploads.blob.core.windows.net/mission-proofs/USR015/1786441733218-mission-proofjpg	image/jpeg	30974	MISSION_PROOF	2026-08-11 09:48:53.255	\N	\N
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: sdgadmin
--

COPY public."User" (id, name, email, "passwordHash", role, "createdAt", "updatedAt", "lastRecyclingSubmissionAt", "suspiciousActivityFlagged", "isActive", "deactivatedAt", "deactivationReason") FROM stdin;
USR001	Admin User	admin@uow.edu.my	$2b$10$tAWWPJyahFWu7w.E2YhZ6e/5WEBGakIVl.k8Laupq.D9wuESDUxq6	ADMIN	2026-08-06 09:44:42.161	2026-08-06 09:44:42.161	\N	f	t	\N	\N
USR007	Vickramraaj Chan Gurusamy	m44100477@student.uow.edu.my	$2b$10$3cUg2lXYq1biR5yN7vTtj.Z3k6Qc/oqCXcZLEgFws/hy5cSt2BW/y	STUDENT	2026-08-06 11:00:10.798	2026-08-10 02:00:06.348	\N	f	f	2026-08-10 02:00:06.337	Auto-deactivated: no recycling submission in 3+ days
USR004	Student Three	student3@student.uow.edu.my	$2b$10$tAWWPJyahFWu7w.E2YhZ6e/5WEBGakIVl.k8Laupq.D9wuESDUxq6	STUDENT	2026-08-06 09:44:42.186	2026-08-10 02:00:06.874	2026-08-06 14:46:08.537	f	f	2026-08-10 02:00:06.872	Auto-deactivated: no recycling submission in 3+ days
USR014	Isya	0137889@student.uow.edu.my	$2b$10$dymuBrIyol8gS05rDZAT2ONJ5HjWc8LdxR/gQ16W6kJSzcROechR2	STUDENT	2026-08-09 13:27:15.995	2026-08-10 07:45:09.008	2026-08-10 07:45:08.976	f	t	\N	\N
USR011	Osmund Michael	068010@student.uow.edu.my	$2b$12$QPwMH1GfIL3zuih26G/FKOLzSUWGTqIAgfeNG6jFA5VH4B/k0sN5G	STUDENT	2026-08-06 14:50:45.369	2026-08-10 13:34:50.47	2026-08-10 13:34:50.445	f	t	\N	\N
USR015	Azura	0135556@student.uow.edu.my	$2b$10$P3WJuJo1vVBA2uuU7fYaUenI0CLNs5HV6XynnRsHcNEkCMp1acQRa	STUDENT	2026-08-10 13:47:57.075	2026-08-10 13:47:57.075	\N	f	t	\N	\N
USR012	Ali Ali	12345@student.uow.edu.my	$2b$10$CNmInXWY2GHUX0GigQY7re5xmIcQ4UzJ18GfVOudN0v9aqO6yswny	STUDENT	2026-08-07 02:03:14.679	2026-08-11 02:00:04.32	2026-08-07 02:04:47.529	f	f	2026-08-11 02:00:04.25	Auto-deactivated: no recycling submission in 3+ days
USR003	Student Two	student2@student.uow.edu.my	$2b$10$tAWWPJyahFWu7w.E2YhZ6e/5WEBGakIVl.k8Laupq.D9wuESDUxq6	STUDENT	2026-08-06 09:44:42.182	2026-08-11 02:00:05.309	2026-08-07 03:42:38.496	f	f	2026-08-11 02:00:05.308	Auto-deactivated: no recycling submission in 3+ days
USR013	Aaron Tan Wen Zhuan	0137612@student.uow.edu.my	$2b$10$SDOp271zgNV0gCLGyQ/J4uxtETlSuQUn8XPnamZyC7oLqH/Ij.Hw2	STUDENT	2026-08-09 12:58:46.011	2026-08-09 13:00:10.45	2026-08-09 13:00:10.367	f	t	\N	\N
USR005	Janusha Suma A/P V Vasanthan	M44100198@student.uow.edu.my	$2b$10$Gy2aWOLyPj86wz4I1bDi6.yvwhN3KRGtwscCXs8YZwTTq9QE43NGi	STUDENT	2026-08-06 10:29:12.497	2026-08-10 02:00:03.894	\N	f	f	2026-08-10 02:00:03.844	Auto-deactivated: no recycling submission in 3+ days
USR006	Wang Sidi	M44100050@student.uow.edu.my	$2b$10$cswj1bKMDjCtccb8k.OD1.4uxGLQS85z1JRw5VjAukE4wIPLplIdG	STUDENT	2026-08-06 10:59:12.445	2026-08-10 02:00:06.145	\N	f	f	2026-08-10 02:00:06.081	Auto-deactivated: no recycling submission in 3+ days
USR002	Student One	student1@student.uow.edu.my	$2b$10$tAWWPJyahFWu7w.E2YhZ6e/5WEBGakIVl.k8Laupq.D9wuESDUxq6	STUDENT	2026-08-06 09:44:42.176	2026-08-11 03:57:17.974	2026-08-11 03:57:17.925	f	t	2026-08-10 02:00:06.778	Auto-deactivated: no recycling submission in 3+ days
USR017	Stephanie Ong	cl.ong@uow.edu.my	$2b$10$1P1E.c8wbn1/vkwMkf6ZEe5VqNU4K6nq7OZSRXMpdgWVjHhSPnaIy	STUDENT	2026-08-11 03:47:07.065	2026-08-11 03:57:49.225	2026-08-11 03:57:49.17	f	t	\N	\N
USR016	Joelynn Shalini James	0137353@student.uow.edu.my	$2b$10$sUK7rtAtuvCy1v8flIIAdOUlwMdak6UcjW2iMgGqzTsEAHwY7YV3y	STUDENT	2026-08-11 03:23:35.438	2026-08-11 04:06:11.001	2026-08-11 04:06:10.978	f	t	\N	\N
USR018	Hang Yih Wah	0138039@student.uow.edu.my	$2b$10$dRJa7XW1YG1KudWyDzjbHu6sZ1r3xN9ZVRFuffKfD3/c4ud.dsZai	STUDENT	2026-08-11 04:35:41.507	2026-08-11 04:35:41.507	\N	f	t	\N	\N
USR019	Gan Ming Yan	0137658@student.uow.edu.my	$2a$12$dzIkUhReV9edbQREGSjz8OVyiFkrVT.jbm//rTlwZi0OkFFdKFLnu	STUDENT	2026-08-11 05:53:10.119	2026-08-11 06:04:26.097	2026-08-11 06:04:26.071	f	t	\N	\N
\.


--
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
a383c769-ffa5-4cb2-b67c-c92a159b2cf1	fad229c179aa4ec9903b2f2ab8cc74dbe2105c72eab570434278c8fe4e8071e1	2026-08-09 12:36:12.080181+00	20260807120000_add_audit_log	\N	\N	2026-08-09 12:36:12.010207+00	1
3909bdc5-c9a3-46b5-ac3f-4b6a6329005e	c150775f6df0c57d437f034173fb130e9ecbb75fe3ad2973629d72d47210f9cf	2026-08-06 09:44:33.768235+00	20260728010000_remove_content_category	\N	\N	2026-08-06 09:44:33.628303+00	1
660c3363-88a3-4037-a745-1aa1468ae8e7	b2e0fcbb3b96c8c8bd82d31f7735370eb618a05dabf69f05b23025d2685b2dfe	2026-08-06 09:44:35.166218+00	20260730110000_add_mission_completion_points_trigger	\N	\N	2026-08-06 09:44:35.078996+00	1
a249fb44-a8b4-4c08-bcc8-b9a88ab530ba	421330fb3ae2b0a50126344a6ee266f93c78499159ac328c02a6e6c18f430a6b	2026-08-06 09:44:33.975103+00	20260728020000_add_learning_progress_best_score	\N	\N	2026-08-06 09:44:33.837237+00	1
2e54e5ad-ddec-4af4-8d0e-097bcc83c364	f84896a6512c7cba2956bd018631f857501268224fb5ad48dc4d2871ee8499af	2026-08-06 09:44:34.116361+00	20260728030000_add_quiz_attempt_time_spent	\N	\N	2026-08-06 09:44:33.986506+00	1
d9ce18d8-d8c3-4a67-a44e-2879c55fcad2	9e47db8d5ba669bd329405838c18e51bafe0329fb46debe0fa588babd2539693	2026-08-06 09:44:34.326173+00	20260728040000_use_question_count_quiz_scores	\N	\N	2026-08-06 09:44:34.184204+00	1
951643f0-2440-4089-895e-cee98b506642	ab446a5d9c65bead47b460cd88fd9dc1ed0c36e0c5d7d5068e51f1dd42b90776	2026-08-06 09:44:35.326751+00	20260803065023_add_recycling_rewards_anti_gaming_leaderboard	\N	\N	2026-08-06 09:44:35.173345+00	1
a44727ec-68bf-4e3e-93ca-733cc0c02e55	cbbde390148489e38354606dc9ec5dd405a2cfe32741170b8c5df8577c0c712f	2026-08-06 09:44:34.529529+00	20260728050000_add_content_image_upload_purpose	\N	\N	2026-08-06 09:44:34.372894+00	1
e5856d6f-113c-4ff2-b61e-e65742632db6	161f9cb706aaaef1b258b403f519e7ae3cfe1a54d4b1e54b02cb18b2222bb765	2026-08-06 09:44:34.719197+00	20260728060000_add_mission_image_upload_purpose	\N	\N	2026-08-06 09:44:34.573168+00	1
e2192db8-2dbc-4da4-9bd6-4d8405f9d5cf	22b02e911ec81e32163e5e7e159b0fd8d79673c185b6a2ed195e4f232016ff2f	2026-08-06 09:44:34.836766+00	20260729021000_add_approved_submissions_badge_criteria	\N	\N	2026-08-06 09:44:34.726838+00	1
54bee76b-d3fc-4b85-ba00-89f0c172b97c	6f1134ad465ebe2a8c44dee7509df1dfd9858276b70fea83fc9f9b9c7f7283b9	2026-08-09 12:36:12.1007+00	20260809190000_add_badge_reward_points	\N	\N	2026-08-09 12:36:12.086712+00	1
76f35526-3d76-404a-8324-6c0f8d069520	03f3d024154e46b8c66b8469f3df77d958e926dea5b3a8ce2107a9a990803162	2026-08-06 09:44:35.35296+00	20260803065336_add_points_event_idempotency_indexes	\N	\N	2026-08-06 09:44:35.338114+00	1
de843547-ac97-4a4d-962d-9f39de9d3dfe	2d5c700017caf0a39b32ff27343d7c982e62f4d0c6e23ee52fb818259aaf2d6f	2026-08-06 09:44:35.398462+00	20260805120000_add_user_deactivation_and_admin_notifications	\N	\N	2026-08-06 09:44:35.367174+00	1
b17e684a-e6f3-4d12-9e0e-8d072312704d	8707f96ec4c4a5ac5c56fa2a4edb1966dab62bd1bd2e3ee0d15d98a44987d263	2026-08-06 09:44:35.428391+00	20260806140000_add_direct_db_approval_points_triggers	\N	\N	2026-08-06 09:44:35.412125+00	1
ecc8ac95-a31f-4687-9f80-dbbbf933d81f	86c42a38351cbe25075707e7543808d4650914d6eae9e3243c9bbbb4117b5986	2026-08-06 09:44:35.450903+00	20260806153000_fix_recycling_approval_trigger_points	\N	\N	2026-08-06 09:44:35.435474+00	1
\.


--
-- Name: PointsEvent_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sdgadmin
--

SELECT pg_catalog.setval('public."PointsEvent_id_seq"', 50, true);


--
-- Name: AdminNotification AdminNotification_pkey; Type: CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."AdminNotification"
    ADD CONSTRAINT "AdminNotification_pkey" PRIMARY KEY (id);


--
-- Name: AuditLog AuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY (id);


--
-- Name: BadgeAward BadgeAward_pkey; Type: CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."BadgeAward"
    ADD CONSTRAINT "BadgeAward_pkey" PRIMARY KEY (id);


--
-- Name: Badge Badge_pkey; Type: CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."Badge"
    ADD CONSTRAINT "Badge_pkey" PRIMARY KEY (id);


--
-- Name: ContentRevision ContentRevision_pkey; Type: CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."ContentRevision"
    ADD CONSTRAINT "ContentRevision_pkey" PRIMARY KEY (id);


--
-- Name: Content Content_pkey; Type: CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."Content"
    ADD CONSTRAINT "Content_pkey" PRIMARY KEY (id);


--
-- Name: LearningProgress LearningProgress_pkey; Type: CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."LearningProgress"
    ADD CONSTRAINT "LearningProgress_pkey" PRIMARY KEY (id);


--
-- Name: MissionSubmission MissionSubmission_pkey; Type: CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."MissionSubmission"
    ADD CONSTRAINT "MissionSubmission_pkey" PRIMARY KEY (id);


--
-- Name: Mission Mission_pkey; Type: CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."Mission"
    ADD CONSTRAINT "Mission_pkey" PRIMARY KEY (id);


--
-- Name: PointRate PointRate_pkey; Type: CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."PointRate"
    ADD CONSTRAINT "PointRate_pkey" PRIMARY KEY (material);


--
-- Name: PointsEvent PointsEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."PointsEvent"
    ADD CONSTRAINT "PointsEvent_pkey" PRIMARY KEY (id);


--
-- Name: QuizAttempt QuizAttempt_pkey; Type: CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."QuizAttempt"
    ADD CONSTRAINT "QuizAttempt_pkey" PRIMARY KEY (id);


--
-- Name: QuizQuestion QuizQuestion_pkey; Type: CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."QuizQuestion"
    ADD CONSTRAINT "QuizQuestion_pkey" PRIMARY KEY (id);


--
-- Name: Quiz Quiz_pkey; Type: CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."Quiz"
    ADD CONSTRAINT "Quiz_pkey" PRIMARY KEY (id);


--
-- Name: RecyclingQrCode RecyclingQrCode_pkey; Type: CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."RecyclingQrCode"
    ADD CONSTRAINT "RecyclingQrCode_pkey" PRIMARY KEY (id);


--
-- Name: RecyclingSubmission RecyclingSubmission_pkey; Type: CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."RecyclingSubmission"
    ADD CONSTRAINT "RecyclingSubmission_pkey" PRIMARY KEY (id);


--
-- Name: RedemptionCooldown RedemptionCooldown_pkey; Type: CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."RedemptionCooldown"
    ADD CONSTRAINT "RedemptionCooldown_pkey" PRIMARY KEY (id);


--
-- Name: Redemption Redemption_pkey; Type: CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."Redemption"
    ADD CONSTRAINT "Redemption_pkey" PRIMARY KEY (id);


--
-- Name: RewardTier RewardTier_pkey; Type: CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."RewardTier"
    ADD CONSTRAINT "RewardTier_pkey" PRIMARY KEY (tier);


--
-- Name: Reward Reward_pkey; Type: CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."Reward"
    ADD CONSTRAINT "Reward_pkey" PRIMARY KEY (id);


--
-- Name: SuspiciousActivityLog SuspiciousActivityLog_pkey; Type: CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."SuspiciousActivityLog"
    ADD CONSTRAINT "SuspiciousActivityLog_pkey" PRIMARY KEY (id);


--
-- Name: UploadedFile UploadedFile_pkey; Type: CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."UploadedFile"
    ADD CONSTRAINT "UploadedFile_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: AdminNotification_isRead_createdAt_idx; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE INDEX "AdminNotification_isRead_createdAt_idx" ON public."AdminNotification" USING btree ("isRead", "createdAt");


--
-- Name: AdminNotification_targetUserId_idx; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE INDEX "AdminNotification_targetUserId_idx" ON public."AdminNotification" USING btree ("targetUserId");


--
-- Name: AuditLog_action_idx; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE INDEX "AuditLog_action_idx" ON public."AuditLog" USING btree (action);


--
-- Name: AuditLog_createdAt_idx; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE INDEX "AuditLog_createdAt_idx" ON public."AuditLog" USING btree ("createdAt");


--
-- Name: AuditLog_userId_idx; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE INDEX "AuditLog_userId_idx" ON public."AuditLog" USING btree ("userId");


--
-- Name: BadgeAward_userId_awardedAt_idx; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE INDEX "BadgeAward_userId_awardedAt_idx" ON public."BadgeAward" USING btree ("userId", "awardedAt");


--
-- Name: BadgeAward_userId_badgeId_key; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE UNIQUE INDEX "BadgeAward_userId_badgeId_key" ON public."BadgeAward" USING btree ("userId", "badgeId");


--
-- Name: Badge_slug_key; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE UNIQUE INDEX "Badge_slug_key" ON public."Badge" USING btree (slug);


--
-- Name: ContentRevision_contentId_version_idx; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE INDEX "ContentRevision_contentId_version_idx" ON public."ContentRevision" USING btree ("contentId", version);


--
-- Name: Content_slug_key; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE UNIQUE INDEX "Content_slug_key" ON public."Content" USING btree (slug);


--
-- Name: LearningProgress_userId_contentId_key; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE UNIQUE INDEX "LearningProgress_userId_contentId_key" ON public."LearningProgress" USING btree ("userId", "contentId");


--
-- Name: LearningProgress_userId_lastActivityAt_idx; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE INDEX "LearningProgress_userId_lastActivityAt_idx" ON public."LearningProgress" USING btree ("userId", "lastActivityAt");


--
-- Name: MissionSubmission_missionId_userId_submittedAt_idx; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE INDEX "MissionSubmission_missionId_userId_submittedAt_idx" ON public."MissionSubmission" USING btree ("missionId", "userId", "submittedAt");


--
-- Name: MissionSubmission_status_submittedAt_idx; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE INDEX "MissionSubmission_status_submittedAt_idx" ON public."MissionSubmission" USING btree (status, "submittedAt");


--
-- Name: Mission_isActive_idx; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE INDEX "Mission_isActive_idx" ON public."Mission" USING btree ("isActive");


--
-- Name: Mission_slug_key; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE UNIQUE INDEX "Mission_slug_key" ON public."Mission" USING btree (slug);


--
-- Name: Mission_status_startAt_endAt_idx; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE INDEX "Mission_status_startAt_endAt_idx" ON public."Mission" USING btree (status, "startAt", "endAt");


--
-- Name: PointsEvent_mission_completed_user_mission_key; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE UNIQUE INDEX "PointsEvent_mission_completed_user_mission_key" ON public."PointsEvent" USING btree ("userId", "missionId", "eventType") WHERE (("eventType" = 'MISSION_COMPLETED'::public."PointsEventType") AND ("missionId" IS NOT NULL));


--
-- Name: PointsEvent_recycling_approved_submission_key; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE UNIQUE INDEX "PointsEvent_recycling_approved_submission_key" ON public."PointsEvent" USING btree ("recyclingSubmissionId") WHERE (("eventType" = 'RECYCLING_APPROVED'::public."PointsEventType") AND ("recyclingSubmissionId" IS NOT NULL));


--
-- Name: PointsEvent_reward_redeemed_redemption_key; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE UNIQUE INDEX "PointsEvent_reward_redeemed_redemption_key" ON public."PointsEvent" USING btree ("redemptionId") WHERE (("eventType" = 'REWARD_REDEEMED'::public."PointsEventType") AND ("redemptionId" IS NOT NULL));


--
-- Name: PointsEvent_reward_refunded_redemption_key; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE UNIQUE INDEX "PointsEvent_reward_refunded_redemption_key" ON public."PointsEvent" USING btree ("redemptionId") WHERE (("eventType" = 'REWARD_REFUNDED'::public."PointsEventType") AND ("redemptionId" IS NOT NULL));


--
-- Name: PointsEvent_status_createdAt_idx; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE INDEX "PointsEvent_status_createdAt_idx" ON public."PointsEvent" USING btree (status, "createdAt");


--
-- Name: PointsEvent_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE INDEX "PointsEvent_userId_createdAt_idx" ON public."PointsEvent" USING btree ("userId", "createdAt");


--
-- Name: PointsEvent_userId_eventType_idx; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE INDEX "PointsEvent_userId_eventType_idx" ON public."PointsEvent" USING btree ("userId", "eventType");


--
-- Name: QuizAttempt_userId_attemptedAt_idx; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE INDEX "QuizAttempt_userId_attemptedAt_idx" ON public."QuizAttempt" USING btree ("userId", "attemptedAt");


--
-- Name: QuizQuestion_code_key; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE UNIQUE INDEX "QuizQuestion_code_key" ON public."QuizQuestion" USING btree (code);


--
-- Name: Quiz_slug_key; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE UNIQUE INDEX "Quiz_slug_key" ON public."Quiz" USING btree (slug);


--
-- Name: RecyclingQrCode_claimedById_claimedAt_idx; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE INDEX "RecyclingQrCode_claimedById_claimedAt_idx" ON public."RecyclingQrCode" USING btree ("claimedById", "claimedAt");


--
-- Name: RecyclingQrCode_issuedById_createdAt_idx; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE INDEX "RecyclingQrCode_issuedById_createdAt_idx" ON public."RecyclingQrCode" USING btree ("issuedById", "createdAt");


--
-- Name: RecyclingQrCode_nonce_key; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE UNIQUE INDEX "RecyclingQrCode_nonce_key" ON public."RecyclingQrCode" USING btree (nonce);


--
-- Name: RecyclingQrCode_status_expiresAt_idx; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE INDEX "RecyclingQrCode_status_expiresAt_idx" ON public."RecyclingQrCode" USING btree (status, "expiresAt");


--
-- Name: RecyclingSubmission_materialType_idx; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE INDEX "RecyclingSubmission_materialType_idx" ON public."RecyclingSubmission" USING btree ("materialType");


--
-- Name: RecyclingSubmission_qrCodeId_key; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE UNIQUE INDEX "RecyclingSubmission_qrCodeId_key" ON public."RecyclingSubmission" USING btree ("qrCodeId");


--
-- Name: RecyclingSubmission_source_submittedAt_idx; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE INDEX "RecyclingSubmission_source_submittedAt_idx" ON public."RecyclingSubmission" USING btree (source, "submittedAt");


--
-- Name: RecyclingSubmission_status_submittedAt_idx; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE INDEX "RecyclingSubmission_status_submittedAt_idx" ON public."RecyclingSubmission" USING btree (status, "submittedAt");


--
-- Name: RecyclingSubmission_userId_submittedAt_idx; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE INDEX "RecyclingSubmission_userId_submittedAt_idx" ON public."RecyclingSubmission" USING btree ("userId", "submittedAt");


--
-- Name: RedemptionCooldown_userId_rewardId_key; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE UNIQUE INDEX "RedemptionCooldown_userId_rewardId_key" ON public."RedemptionCooldown" USING btree ("userId", "rewardId");


--
-- Name: Redemption_rewardId_idx; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE INDEX "Redemption_rewardId_idx" ON public."Redemption" USING btree ("rewardId");


--
-- Name: Redemption_status_idx; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE INDEX "Redemption_status_idx" ON public."Redemption" USING btree (status);


--
-- Name: Redemption_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE INDEX "Redemption_userId_createdAt_idx" ON public."Redemption" USING btree ("userId", "createdAt");


--
-- Name: Reward_imageUploadId_key; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE UNIQUE INDEX "Reward_imageUploadId_key" ON public."Reward" USING btree ("imageUploadId");


--
-- Name: Reward_isActive_pointsRequired_idx; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE INDEX "Reward_isActive_pointsRequired_idx" ON public."Reward" USING btree ("isActive", "pointsRequired");


--
-- Name: Reward_isActive_tier_idx; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE INDEX "Reward_isActive_tier_idx" ON public."Reward" USING btree ("isActive", tier);


--
-- Name: SuspiciousActivityLog_severity_detectedAt_idx; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE INDEX "SuspiciousActivityLog_severity_detectedAt_idx" ON public."SuspiciousActivityLog" USING btree (severity, "detectedAt");


--
-- Name: SuspiciousActivityLog_userId_detectedAt_idx; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE INDEX "SuspiciousActivityLog_userId_detectedAt_idx" ON public."SuspiciousActivityLog" USING btree ("userId", "detectedAt");


--
-- Name: UploadedFile_recyclingSubmissionId_idx; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE INDEX "UploadedFile_recyclingSubmissionId_idx" ON public."UploadedFile" USING btree ("recyclingSubmissionId");


--
-- Name: UploadedFile_rewardId_idx; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE INDEX "UploadedFile_rewardId_idx" ON public."UploadedFile" USING btree ("rewardId");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: sdgadmin
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: MissionSubmission mission_completion_points_event_trigger; Type: TRIGGER; Schema: public; Owner: sdgadmin
--

CREATE TRIGGER mission_completion_points_event_trigger AFTER INSERT OR UPDATE OF status, quantity, "reviewedAt" ON public."MissionSubmission" FOR EACH ROW EXECUTE FUNCTION public.create_mission_completion_points_event();


--
-- Name: RecyclingSubmission prepare_recycling_approval_points_trigger; Type: TRIGGER; Schema: public; Owner: sdgadmin
--

CREATE TRIGGER prepare_recycling_approval_points_trigger BEFORE INSERT OR UPDATE OF status, "pointsAwarded", "reviewedAt" ON public."RecyclingSubmission" FOR EACH ROW EXECUTE FUNCTION public.prepare_recycling_approval_points();


--
-- Name: RecyclingSubmission recycling_approval_points_event_trigger; Type: TRIGGER; Schema: public; Owner: sdgadmin
--

CREATE TRIGGER recycling_approval_points_event_trigger AFTER INSERT OR UPDATE OF status, "pointsAwarded", "reviewedAt" ON public."RecyclingSubmission" FOR EACH ROW EXECUTE FUNCTION public.create_recycling_approval_points_event();


--
-- Name: Redemption redemption_cancelled_refund_points_trigger; Type: TRIGGER; Schema: public; Owner: sdgadmin
--

CREATE TRIGGER redemption_cancelled_refund_points_trigger BEFORE UPDATE OF status ON public."Redemption" FOR EACH ROW EXECUTE FUNCTION public.refund_points_and_stock_when_redemption_cancelled();


--
-- Name: AdminNotification AdminNotification_targetUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."AdminNotification"
    ADD CONSTRAINT "AdminNotification_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AuditLog AuditLog_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: BadgeAward BadgeAward_badgeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."BadgeAward"
    ADD CONSTRAINT "BadgeAward_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES public."Badge"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: BadgeAward BadgeAward_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."BadgeAward"
    ADD CONSTRAINT "BadgeAward_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ContentRevision ContentRevision_contentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."ContentRevision"
    ADD CONSTRAINT "ContentRevision_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES public."Content"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Content Content_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."Content"
    ADD CONSTRAINT "Content_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: LearningProgress LearningProgress_contentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."LearningProgress"
    ADD CONSTRAINT "LearningProgress_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES public."Content"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: LearningProgress LearningProgress_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."LearningProgress"
    ADD CONSTRAINT "LearningProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MissionSubmission MissionSubmission_missionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."MissionSubmission"
    ADD CONSTRAINT "MissionSubmission_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES public."Mission"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MissionSubmission MissionSubmission_reviewedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."MissionSubmission"
    ADD CONSTRAINT "MissionSubmission_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: MissionSubmission MissionSubmission_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."MissionSubmission"
    ADD CONSTRAINT "MissionSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Mission Mission_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."Mission"
    ADD CONSTRAINT "Mission_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PointsEvent PointsEvent_missionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."PointsEvent"
    ADD CONSTRAINT "PointsEvent_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES public."Mission"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PointsEvent PointsEvent_recyclingSubmissionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."PointsEvent"
    ADD CONSTRAINT "PointsEvent_recyclingSubmissionId_fkey" FOREIGN KEY ("recyclingSubmissionId") REFERENCES public."RecyclingSubmission"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PointsEvent PointsEvent_redemptionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."PointsEvent"
    ADD CONSTRAINT "PointsEvent_redemptionId_fkey" FOREIGN KEY ("redemptionId") REFERENCES public."Redemption"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PointsEvent PointsEvent_submissionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."PointsEvent"
    ADD CONSTRAINT "PointsEvent_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES public."MissionSubmission"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PointsEvent PointsEvent_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."PointsEvent"
    ADD CONSTRAINT "PointsEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: QuizAttempt QuizAttempt_quizId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."QuizAttempt"
    ADD CONSTRAINT "QuizAttempt_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES public."Quiz"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: QuizAttempt QuizAttempt_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."QuizAttempt"
    ADD CONSTRAINT "QuizAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: QuizQuestion QuizQuestion_quizId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."QuizQuestion"
    ADD CONSTRAINT "QuizQuestion_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES public."Quiz"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Quiz Quiz_contentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."Quiz"
    ADD CONSTRAINT "Quiz_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES public."Content"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RecyclingQrCode RecyclingQrCode_claimedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."RecyclingQrCode"
    ADD CONSTRAINT "RecyclingQrCode_claimedById_fkey" FOREIGN KEY ("claimedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: RecyclingQrCode RecyclingQrCode_invalidatedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."RecyclingQrCode"
    ADD CONSTRAINT "RecyclingQrCode_invalidatedById_fkey" FOREIGN KEY ("invalidatedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: RecyclingQrCode RecyclingQrCode_issuedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."RecyclingQrCode"
    ADD CONSTRAINT "RecyclingQrCode_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RecyclingSubmission RecyclingSubmission_qrCodeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."RecyclingSubmission"
    ADD CONSTRAINT "RecyclingSubmission_qrCodeId_fkey" FOREIGN KEY ("qrCodeId") REFERENCES public."RecyclingQrCode"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: RecyclingSubmission RecyclingSubmission_reviewedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."RecyclingSubmission"
    ADD CONSTRAINT "RecyclingSubmission_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: RecyclingSubmission RecyclingSubmission_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."RecyclingSubmission"
    ADD CONSTRAINT "RecyclingSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RedemptionCooldown RedemptionCooldown_rewardId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."RedemptionCooldown"
    ADD CONSTRAINT "RedemptionCooldown_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES public."Reward"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RedemptionCooldown RedemptionCooldown_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."RedemptionCooldown"
    ADD CONSTRAINT "RedemptionCooldown_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Redemption Redemption_rewardId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."Redemption"
    ADD CONSTRAINT "Redemption_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES public."Reward"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Redemption Redemption_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."Redemption"
    ADD CONSTRAINT "Redemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Reward Reward_imageUploadId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."Reward"
    ADD CONSTRAINT "Reward_imageUploadId_fkey" FOREIGN KEY ("imageUploadId") REFERENCES public."UploadedFile"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SuspiciousActivityLog SuspiciousActivityLog_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."SuspiciousActivityLog"
    ADD CONSTRAINT "SuspiciousActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: UploadedFile UploadedFile_missionSubmissionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."UploadedFile"
    ADD CONSTRAINT "UploadedFile_missionSubmissionId_fkey" FOREIGN KEY ("missionSubmissionId") REFERENCES public."MissionSubmission"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: UploadedFile UploadedFile_recyclingSubmissionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."UploadedFile"
    ADD CONSTRAINT "UploadedFile_recyclingSubmissionId_fkey" FOREIGN KEY ("recyclingSubmissionId") REFERENCES public."RecyclingSubmission"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: UploadedFile UploadedFile_rewardId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."UploadedFile"
    ADD CONSTRAINT "UploadedFile_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES public."Reward"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: UploadedFile UploadedFile_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sdgadmin
--

ALTER TABLE ONLY public."UploadedFile"
    ADD CONSTRAINT "UploadedFile_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: sdgadmin
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict F9Vr3jVf3cxYyvVSVrlQBEhgKOzhtCy3NfAVmnuyMPf3dORCZA7p0GjTMmYM4SO

