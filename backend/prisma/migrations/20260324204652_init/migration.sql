-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('super_admin', 'coaching_admin', 'student');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "DifficultyLevel" AS ENUM ('easy', 'medium', 'hard');

-- CreateEnum
CREATE TYPE "TestType" AS ENUM ('topic_wise', 'full_length');

-- CreateEnum
CREATE TYPE "OptionChoice" AS ENUM ('A', 'B', 'C', 'D');

-- CreateEnum
CREATE TYPE "PaymentState" AS ENUM ('pending', 'success', 'failed');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coaching_institutes" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "institute_name" VARCHAR(255) NOT NULL,
    "admin_name" VARCHAR(255) NOT NULL,
    "phone_number" VARCHAR(20) NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'pending',
    "approved_by" UUID,
    "approved_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coaching_institutes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "phone_number" VARCHAR(20) NOT NULL,
    "coaching_id" UUID NOT NULL,
    "exam_preparing_for" VARCHAR(100) NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'pending',
    "approved_by" UUID,
    "approved_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" UUID NOT NULL,
    "coaching_id" UUID NOT NULL,
    "subject" VARCHAR(100) NOT NULL,
    "topic" VARCHAR(100) NOT NULL,
    "question_text" TEXT NOT NULL,
    "question_image_url" TEXT,
    "option_a" TEXT NOT NULL,
    "option_b" TEXT NOT NULL,
    "option_c" TEXT NOT NULL,
    "option_d" TEXT NOT NULL,
    "correct_option" "OptionChoice" NOT NULL,
    "marks" INTEGER NOT NULL,
    "negative_marks" INTEGER NOT NULL DEFAULT 0,
    "difficulty" "DifficultyLevel" NOT NULL,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_series" (
    "id" UUID NOT NULL,
    "coaching_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "exam_type" VARCHAR(100) NOT NULL,
    "subjects_covered" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "total_tests" INTEGER NOT NULL DEFAULT 0,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tests" (
    "id" UUID NOT NULL,
    "coaching_id" UUID NOT NULL,
    "test_series_id" UUID,
    "title" VARCHAR(255) NOT NULL,
    "type" "TestType" NOT NULL,
    "total_questions" INTEGER NOT NULL,
    "total_marks" INTEGER NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "scheduled_start" TIMESTAMP(3),
    "scheduled_end" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_sections" (
    "id" UUID NOT NULL,
    "test_id" UUID NOT NULL,
    "section_name" VARCHAR(100) NOT NULL,
    "question_count" INTEGER NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "order_index" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_questions" (
    "id" UUID NOT NULL,
    "test_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "section_id" UUID,
    "order_index" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchases" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "test_series_id" UUID NOT NULL,
    "amount_paid" DECIMAL(10,2) NOT NULL,
    "payment_id" VARCHAR(255),
    "payment_status" "PaymentState" NOT NULL DEFAULT 'pending',
    "purchased_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_attempts" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "test_id" UUID NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMP(3),
    "is_submitted" BOOLEAN NOT NULL DEFAULT false,
    "current_section_id" UUID,
    "score" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_answers" (
    "id" UUID NOT NULL,
    "attempt_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "selected_option" "OptionChoice",
    "is_marked_review" BOOLEAN NOT NULL DEFAULT false,
    "time_spent_seconds" INTEGER NOT NULL DEFAULT 0,
    "saved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "results" (
    "id" UUID NOT NULL,
    "attempt_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "test_id" UUID NOT NULL,
    "total_score" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "correct_count" INTEGER NOT NULL DEFAULT 0,
    "wrong_count" INTEGER NOT NULL DEFAULT 0,
    "unattempted_count" INTEGER NOT NULL DEFAULT 0,
    "accuracy_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_email" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "coaching_institutes_user_id_key" ON "coaching_institutes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "students_user_id_key" ON "students"("user_id");

-- CreateIndex
CREATE INDEX "idx_students_coaching_id" ON "students"("coaching_id");

-- CreateIndex
CREATE INDEX "idx_questions_coaching_id" ON "questions"("coaching_id");

-- CreateIndex
CREATE INDEX "idx_test_series_coaching_id" ON "test_series"("coaching_id");

-- CreateIndex
CREATE INDEX "idx_tests_coaching_id" ON "tests"("coaching_id");

-- CreateIndex
CREATE INDEX "idx_test_sections_test_id" ON "test_sections"("test_id");

-- CreateIndex
CREATE INDEX "idx_test_questions_test_id" ON "test_questions"("test_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_test_question" ON "test_questions"("test_id", "question_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchases_payment_id_key" ON "purchases"("payment_id");

-- CreateIndex
CREATE INDEX "idx_purchases_student_id" ON "purchases"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_student_series_purchase" ON "purchases"("student_id", "test_series_id");

-- CreateIndex
CREATE INDEX "idx_exam_attempts_student_id" ON "exam_attempts"("student_id");

-- CreateIndex
CREATE INDEX "idx_exam_attempts_test_id" ON "exam_attempts"("test_id");

-- CreateIndex
CREATE INDEX "idx_student_answers_attempt_id" ON "student_answers"("attempt_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_attempt_question" ON "student_answers"("attempt_id", "question_id");

-- CreateIndex
CREATE UNIQUE INDEX "results_attempt_id_key" ON "results"("attempt_id");

-- CreateIndex
CREATE INDEX "idx_results_test_id" ON "results"("test_id");

-- AddForeignKey
ALTER TABLE "coaching_institutes" ADD CONSTRAINT "coaching_institutes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coaching_institutes" ADD CONSTRAINT "coaching_institutes_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_coaching_id_fkey" FOREIGN KEY ("coaching_id") REFERENCES "coaching_institutes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_coaching_id_fkey" FOREIGN KEY ("coaching_id") REFERENCES "coaching_institutes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_series" ADD CONSTRAINT "test_series_coaching_id_fkey" FOREIGN KEY ("coaching_id") REFERENCES "coaching_institutes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tests" ADD CONSTRAINT "tests_coaching_id_fkey" FOREIGN KEY ("coaching_id") REFERENCES "coaching_institutes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tests" ADD CONSTRAINT "tests_test_series_id_fkey" FOREIGN KEY ("test_series_id") REFERENCES "test_series"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_sections" ADD CONSTRAINT "test_sections_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_questions" ADD CONSTRAINT "test_questions_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_questions" ADD CONSTRAINT "test_questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_questions" ADD CONSTRAINT "test_questions_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "test_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_test_series_id_fkey" FOREIGN KEY ("test_series_id") REFERENCES "test_series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_current_section_id_fkey" FOREIGN KEY ("current_section_id") REFERENCES "test_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_answers" ADD CONSTRAINT "student_answers_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "exam_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_answers" ADD CONSTRAINT "student_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "exam_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
