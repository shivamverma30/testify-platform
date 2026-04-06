export type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

export type UserRole = "student" | "coaching_admin" | "super_admin";

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
};

export type LoginResponse = {
  token: string;
  user: AuthUser;
};

export type StudentRegistrationPayload = {
  name: string;
  email: string;
  password: string;
  selected_coaching_id: string;
  phone: string;
  exam_preparing_for: string;
};

export type CoachingRegistrationPayload = {
  institute_name: string;
  admin_name: string;
  email: string;
  phone: string;
  password: string;
};

export type ApprovedCoachingOption = {
  id: string;
  instituteName: string;
};

export type PendingStudent = {
  id: string;
  name: string;
  phoneNumber: string;
  examPreparingFor: string;
  status: "pending";
  createdAt: string;
  user: {
    email: string;
  };
};

export type StudentStatus = "pending" | "approved" | "rejected";

export type AdminStudent = {
  id: string;
  name: string;
  phoneNumber: string;
  examPreparingFor: string;
  status: StudentStatus;
  createdAt: string;
  approvedAt: string | null;
  rejectionReason: string | null;
  user: {
    email: string;
  };
};

export type AdminStudentProfile = {
  id: string;
  name: string;
  email: string | null;
  phone_number: string;
  exam_preparing_for: string;
  status: StudentStatus;
  created_at: string;
  approved_at: string | null;
  rejection_reason: string | null;
  stats: {
    attempts: number;
    results: number;
    purchases: number;
  };
};

export type AdminAnalyticsResponse = {
  metrics: {
    total_students_attempted: number;
    average_score: number;
    highest_score: number;
    lowest_score: number;
    accuracy_percentage: number;
  };
  score_distribution: Array<{
    range: string;
    count: number;
  }>;
  section_performance: Array<{
    section_name: string;
    attempted: number;
    accuracy_percentage: number;
  }>;
  difficulty_analysis: Array<{
    difficulty: "easy" | "medium" | "hard";
    attempted: number;
    correct: number;
    accuracy_percentage: number;
  }>;
};

export type AdminTestAnalyticsResponse = {
  test: {
    id: string;
    title: string;
  };
  metrics: {
    total_students_attempted: number;
    average_score: number;
    highest_score: number;
    lowest_score: number;
    accuracy_percentage: number;
  };
  score_distribution: Array<{
    range: string;
    count: number;
  }>;
  section_performance: Array<{
    section_name: string;
    attempted: number;
    accuracy_percentage: number;
  }>;
  difficulty_analysis: Array<{
    difficulty: "easy" | "medium" | "hard";
    attempted: number;
    correct: number;
    accuracy_percentage: number;
  }>;
  most_incorrect_questions: Array<{
    question_id: string;
    question_text: string;
    subject: string;
    topic: string;
    attempted_count: number;
    wrong_count: number;
    accuracy_percentage: number;
  }>;
  most_attempted_questions: Array<{
    question_id: string;
    question_text: string;
    subject: string;
    topic: string;
    attempted_count: number;
    wrong_count: number;
    accuracy_percentage: number;
  }>;
  question_analytics: {
    top_n: number | null;
    incorrect_questions: {
      items: Array<{
        question_id: string;
        question_text: string;
        subject: string;
        topic: string;
        attempted_count: number;
        wrong_count: number;
        accuracy_percentage: number;
      }>;
      pagination: {
        page: number;
        limit: number;
        total_items: number;
        total_pages: number;
        has_next: boolean;
        has_prev: boolean;
      };
    };
    attempted_questions: {
      items: Array<{
        question_id: string;
        question_text: string;
        subject: string;
        topic: string;
        attempted_count: number;
        wrong_count: number;
        accuracy_percentage: number;
      }>;
      pagination: {
        page: number;
        limit: number;
        total_items: number;
        total_pages: number;
        has_next: boolean;
        has_prev: boolean;
      };
    };
  };
};

export type TestLeaderboardResponse = {
  test_id: string;
  test_name: string;
  total_participants: number;
  my_rank: number | null;
  query: {
    top_n: number | null;
  };
  pagination: {
    page: number;
    limit: number;
    total_items: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
  leaderboard: Array<{
    rank: number;
    student_id: string;
    student_name: string;
    total_score: number;
    accuracy_percentage: number;
    generated_at: string;
    result_id: string;
  }>;
};

export type QuestionItem = {
  id: string;
  subject: string;
  topic: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: "A" | "B" | "C" | "D";
  marks: number;
  negativeMarks: number;
  difficulty: "easy" | "medium" | "hard";
  createdAt: string;
  updatedAt?: string;
};

export type QuestionPayload = {
  subject: string;
  topic: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: "A" | "B" | "C" | "D";
  marks: number;
  negative_marks: number;
  difficulty: "easy" | "medium" | "hard";
};

export type AdminTest = {
  id: string;
  coaching_id: string;
  test_series_id: string | null;
  title: string;
  type: "topic_wise" | "full_length";
  total_questions: number;
  total_marks: number;
  duration_minutes: number;
  scheduled_start: string | null;
  scheduled_end: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminTestSeries = {
  id: string;
  coaching_id: string;
  series_name: string;
  description: string | null;
  exam_type: string;
  subjects_covered: string[];
  total_tests: number;
  price: number;
  visibility: "public" | "private";
  created_at: string;
  updated_at: string;
  tests: Array<{
    id: string;
    title: string;
    type: "topic_wise" | "full_length";
    total_questions: number;
    duration_minutes: number;
  }>;
};

export type PendingCoaching = {
  id: string;
  instituteName: string;
  adminName: string;
  phoneNumber: string;
  status: "pending";
  createdAt: string;
  user: {
    email: string;
  };
};

export type SuperAdminStats = {
  total_coaching_institutes: number;
  total_students: number;
  total_tests: number;
  pending_coaching_approvals: number;
  pending_student_approvals: number;
};

export type CoachingManagementItem = {
  id: string;
  instituteName: string;
  adminName: string;
  phoneNumber: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  approvedAt: string | null;
  user: {
    email: string;
  };
};

export type StudentTest = {
  id: string;
  test_series_id: string | null;
  title: string;
  type: "topic_wise" | "full_length";
  total_questions: number;
  total_marks: number;
  duration_minutes: number;
  is_active: boolean;
  scheduled_start: string | null;
  scheduled_end: string | null;
  created_at: string;
  updated_at: string;
};

export type PurchasedTestSeries = {
  id: string;
  test_series_id: string;
  series_name: string;
  coaching_name: string;
  number_of_tests: number;
  price: number;
  purchase_date: string;
  tests: Array<{
    id: string;
    title: string;
    type: "topic_wise" | "full_length";
    total_questions: number;
    duration_minutes: number;
    scheduled_start: string | null;
  }>;
};

export type DashboardOverview = {
  upcoming_tests: Array<{
    id: string;
    test_name: string;
    coaching_name: string;
    test_date: string | null;
    test_time: string | null;
    duration_minutes: number;
    can_attempt_now: boolean;
  }>;
  recent_results: Array<{
    id: string;
    test_id: string;
    test_name: string;
    score: number;
    rank: number | null;
    accuracy: number;
    generated_at: string;
  }>;
  performance_summary: {
    total_tests_attempted: number;
    average_score: number;
    highest_score: number;
    accuracy_percentage: number;
  };
};

export type ScheduledTest = {
  id: string;
  test_name: string;
  test_type: "topic_wise" | "full_length";
  total_questions: number;
  duration_minutes: number;
  scheduled_time: string | null;
  status: "not_started" | "available_to_attempt" | "completed";
};

export type AttemptHistoryItem = {
  id: string;
  result_id: string | null;
  test_id: string;
  test_name: string;
  attempt_date: string;
  score: number | null;
  rank: number | null;
  status: "completed" | "in_progress";
};

export type ResultListItem = {
  id: string;
  test_id: string;
  test_name: string;
  score: number;
  rank: number | null;
  accuracy: number;
  correct_answers: number;
  wrong_answers: number;
  unattempted_questions: number;
  generated_at: string;
};

export type ResultDetail = {
  id: string;
  test_id: string;
  test_name: string;
  coaching_name: string;
  total_questions: number;
  total_marks: number;
  duration_minutes: number;
  scheduled_start: string | null;
  attempt_id: string;
  started_at: string;
  submitted_at: string | null;
  total_score: number;
  correct_answers: number;
  wrong_answers: number;
  unattempted_questions: number;
  accuracy_percentage: number;
  rank: number | null;
  generated_at: string;
  subject_wise_performance: Array<{
    subject: string;
    attempted: number;
    accuracy_percentage: number;
  }>;
  topic_wise_accuracy: Array<{
    topic: string;
    attempted: number;
    accuracy_percentage: number;
  }>;
  question_wise_analysis: Array<{
    question_id: string;
    question_number: number;
    question_text: string;
    subject: string;
    topic: string;
    student_answer: OptionChoice | null;
    correct_answer: OptionChoice;
    is_correct: boolean;
    status: "attempted" | "unattempted";
  }>;
};

export type PerformanceAnalytics = {
  score_trend: Array<{
    label: string;
    score: number;
    accuracy: number;
    generated_at: string;
  }>;
  subject_wise_performance: Array<{
    subject: string;
    attempted: number;
    accuracy_percentage: number;
  }>;
  topic_wise_accuracy: Array<{
    topic: string;
    attempted: number;
    accuracy_percentage: number;
  }>;
  weak_topics: Array<{
    topic: string;
    attempted: number;
    accuracy_percentage: number;
  }>;
  strong_topics: Array<{
    topic: string;
    attempted: number;
    accuracy_percentage: number;
  }>;
};

export type ExploreTestSeriesItem = {
  id: string;
  series_name: string;
  coaching_name: string;
  coaching_id: string | null;
  number_of_tests: number;
  price: number;
  created_at: string;
};

export type StudentProfile = {
  id: string;
  name: string;
  phone_number: string;
  exam_preparing_for: string;
  coaching_id: string;
  coaching_name: string;
};

export type OptionChoice = "A" | "B" | "C" | "D";

export type ExamSection = {
  id: string;
  section_name: string;
  question_count: number;
  duration_minutes: number;
  order_index: number;
};

export type ExamQuestion = {
  id: string;
  section_id: string | null;
  order_index: number;
  question_number: number;
  subject: string;
  topic: string;
  question_text: string;
  question_image_url: string | null;
  options: Record<OptionChoice, string>;
  marks: number;
  negative_marks: number;
};

export type ExamTestMeta = {
  id: string;
  title: string;
  type: "topic_wise" | "full_length";
  total_questions: number;
  total_marks: number;
  duration_minutes: number;
  scheduled_start: string | null;
  scheduled_end: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ExamAttemptAnswer = {
  question_id: string;
  selected_option: OptionChoice | null;
  is_marked_review: boolean;
  time_spent_seconds: number;
  saved_at: string;
};

export type ExamStartResponse = {
  attempt_id: string;
  started_at: string;
  test: ExamTestMeta;
  sections: ExamSection[];
  questions: ExamQuestion[];
  duration_minutes: number;
  answers: ExamAttemptAnswer[];
};

export type ExamDataResponse = {
  test: ExamTestMeta;
  sections: ExamSection[];
  questions: ExamQuestion[];
  duration_minutes: number;
  attempt: {
    id: string;
    started_at: string;
    submitted_at: string | null;
    is_submitted: boolean;
    answers: ExamAttemptAnswer[];
  } | null;
};

export type SaveExamAnswerPayload = {
  attemptId: string;
  questionId: string;
  selectedOption: OptionChoice | null;
  isMarkedReview: boolean;
  timeSpentSeconds?: number;
};

export type ExamSubmitResponse = {
  attempt_id: string;
  result_id: string;
  total_questions: number;
  attempted_questions: number;
  correct_answers: number;
  wrong_answers: number;
  unattempted_questions: number;
  total_score: number;
  accuracy_percentage: number;
};

export type AttemptResultSummary = {
  id: string;
  attempt_id: string;
  test_id: string;
  test_name: string;
  total_score: number;
  correct_answers: number;
  wrong_answers: number;
  unattempted_questions: number;
  accuracy_percentage: number;
  rank: number | null;
  generated_at: string;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

const TOKEN_KEY = "token";
const AUTH_USER_KEY = "auth_user";

type StoredAuthUser = {
  id: string;
  email: string;
  role: UserRole;
};

const readToken = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const cookieToken = document.cookie
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${TOKEN_KEY}=`))
    ?.split("=")[1];

  return (
    window.localStorage.getItem(TOKEN_KEY) ||
    cookieToken ||
    null
  );
};

const decodeBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4;
  const padded = padding ? normalized + "=".repeat(4 - padding) : normalized;

  return atob(padded);
};

const parseTokenPayload = (token: string): { userId: string; role: UserRole } | null => {
  try {
    const tokenParts = token.split(".");

    if (tokenParts.length < 2) {
      return null;
    }

    const payloadText = decodeBase64Url(tokenParts[1]);
    return JSON.parse(payloadText) as { userId: string; role: UserRole };
  } catch {
    return null;
  }
};

export const getCurrentAuthUser = (): { userId: string; role: UserRole } | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const token = readToken();

  if (!token) {
    return null;
  }

  return parseTokenPayload(token);
};

export const getCurrentAuthRole = (): UserRole | null => {
  return getCurrentAuthUser()?.role ?? null;
};

const readStoredAuthUser = (): StoredAuthUser | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.localStorage.getItem(AUTH_USER_KEY);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as StoredAuthUser;
  } catch {
    return null;
  }
};

export const getCurrentAuthProfile = (): {
  userId: string | null;
  role: UserRole | null;
  email: string | null;
} => {
  const tokenUser = getCurrentAuthUser();
  const storedUser = readStoredAuthUser();

  return {
    userId: tokenUser?.userId || storedUser?.id || null,
    role: tokenUser?.role || storedUser?.role || null,
    email: storedUser?.email || null,
  };
};

export const getRoleDefaultRoute = (role: UserRole) => {
  if (role === "student") {
    return "/dashboard";
  }

  if (role === "coaching_admin") {
    return "/admin";
  }

  return "/super-admin";
};

const toBody = (body: unknown) => {
  return body === undefined ? undefined : JSON.stringify(body);
};

const request = async <T>(
  path: string,
  options?: {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    body?: unknown;
  },
): Promise<T> => {
  const token = readToken();
  const method = options?.method ?? "GET";

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: toBody(options?.body),
    cache: "no-store",
  });

  let payload: ApiEnvelope<T> | null = null;

  try {
    payload = (await response.json()) as ApiEnvelope<T>;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.success) {
    throw new ApiError(
      payload?.message || "Request failed. Please try again.",
      response.status,
    );
  }

  return (payload.data ?? null) as T;
};

const requestFormData = async <T>(
  path: string,
  body: FormData,
  method: "POST" | "PUT" | "PATCH" = "POST",
): Promise<T> => {
  const token = readToken();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body,
    cache: "no-store",
  });

  let payload: ApiEnvelope<T> | null = null;

  try {
    payload = (await response.json()) as ApiEnvelope<T>;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.success) {
    throw new ApiError(
      payload?.message || "Request failed. Please try again.",
      response.status,
    );
  }

  return (payload.data ?? null) as T;
};

export const setAuthToken = (token: string) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(TOKEN_KEY, token);
  document.cookie = `${TOKEN_KEY}=${token}; Path=/; Max-Age=604800; SameSite=Lax`;
};

export const clearAuthToken = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(AUTH_USER_KEY);
  document.cookie = `${TOKEN_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
};

export const hasAuthToken = () => {
  return Boolean(readToken());
};

export const login = async (email: string, password: string, role: UserRole) => {
  const payload = await request<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: {
      email,
      password,
      role,
    },
  });

  setAuthToken(payload.token);

  if (typeof window !== "undefined") {
    window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(payload.user));
  }

  return payload;
};

export const registerStudent = (payload: StudentRegistrationPayload) => {
  return request<{
    id: string;
    name: string;
    selected_coaching_id: string;
    status: string;
    created_at: string;
  }>("/api/auth/register-student", {
    method: "POST",
    body: payload,
  });
};

export const registerCoachingInstitute = (payload: CoachingRegistrationPayload) => {
  return request<{
    id: string;
    institute_name: string;
    admin_name: string;
    email: string;
    phone: string;
    status: string;
    created_at: string;
  }>("/api/auth/register-coaching", {
    method: "POST",
    body: payload,
  });
};

export const getApprovedCoachingOptions = () => {
  return request<ApprovedCoachingOption[]>("/api/auth/coaching-options");
};

export const getPendingStudents = () => {
  return request<PendingStudent[]>("/api/admin/students/pending");
};

export const getStudents = (status: StudentStatus) => {
  return request<AdminStudent[]>(`/api/admin/students?status=${status}`);
};

export const getStudentProfile = (studentId: string) => {
  return request<AdminStudentProfile>(`/api/admin/students/${studentId}/profile`);
};

export const approveStudent = (studentId: string) => {
  return request<{ id: string; status: "approved" }>(`/api/admin/students/${studentId}/approve`, {
    method: "PATCH",
  });
};

export const rejectStudent = (studentId: string) => {
  return request<{ id: string; status: "rejected" }>(`/api/admin/students/${studentId}/reject`, {
    method: "PATCH",
  });
};

export const getAdminAnalytics = () => {
  return request<AdminAnalyticsResponse>("/api/admin/analytics");
};

export const getAdminTestAnalytics = (testId: string) => {
  return request<AdminTestAnalyticsResponse>(`/api/admin/tests/${testId}/analytics`);
};

export type AnalyticsListQuery = {
  page?: number;
  limit?: number;
  top_n?: number;
};

const toListQueryString = (query?: AnalyticsListQuery) => {
  if (!query) {
    return "";
  }

  const params = new URLSearchParams();

  if (query.page) {
    params.set("page", String(query.page));
  }

  if (query.limit) {
    params.set("limit", String(query.limit));
  }

  if (query.top_n) {
    params.set("top_n", String(query.top_n));
  }

  const value = params.toString();
  return value ? `?${value}` : "";
};

export const getAdminTestAnalyticsByQuery = (testId: string, query?: AnalyticsListQuery) => {
  return request<AdminTestAnalyticsResponse>(
    `/api/admin/tests/${testId}/analytics${toListQueryString(query)}`,
  );
};

export const getQuestions = (filters?: {
  subject?: string;
  topic?: string;
  difficulty?: "easy" | "medium" | "hard";
  sort?: "newest" | "oldest";
}) => {
  const query = new URLSearchParams();

  if (filters?.subject) query.set("subject", filters.subject);
  if (filters?.topic) query.set("topic", filters.topic);
  if (filters?.difficulty) query.set("difficulty", filters.difficulty);

  const suffix = query.toString() ? `?${query.toString()}` : "";

  return request<QuestionItem[]>(`/api/questions${suffix}`).then((items) => {
    if (filters?.sort === "oldest") {
      return [...items].reverse();
    }

    return items;
  });
};

export const addQuestion = (payload: QuestionPayload) => {
  return request<QuestionItem>("/api/questions", {
    method: "POST",
    body: payload,
  });
};

export const updateQuestion = (questionId: string, payload: Partial<QuestionPayload>) => {
  return request<QuestionItem>(`/api/questions/${questionId}`, {
    method: "PUT",
    body: payload,
  });
};

export const deleteQuestion = (questionId: string) => {
  return request<{ id: string; deleted: boolean }>(`/api/questions/${questionId}`, {
    method: "DELETE",
  });
};

export const bulkUploadQuestions = (file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  return requestFormData<{
    uploaded: number;
    failed: number;
    errors: Array<{ row: number | string; message: string }>;
  }>("/api/questions/bulk-upload", formData, "POST");
};

export const createTest = (payload: {
  title: string;
  test_type: "topic_wise" | "full_length";
  duration_minutes: number;
  total_marks: number;
  test_series_id?: string | null;
}) => {
  return request<AdminTest>("/api/tests", {
    method: "POST",
    body: payload,
  });
};

export const getAdminTests = () => {
  return request<AdminTest[]>("/api/tests");
};

export const getTestLeaderboard = (testId: string, query?: AnalyticsListQuery) => {
  return request<TestLeaderboardResponse>(`/api/tests/${testId}/leaderboard${toListQueryString(query)}`);
};

export const updateTest = (
  testId: string,
  payload: Partial<{
    title: string;
    test_type: "topic_wise" | "full_length";
    duration_minutes: number;
    total_marks: number;
    is_active: boolean;
  }>,
) => {
  return request<AdminTest>(`/api/tests/${testId}`, {
    method: "PATCH",
    body: payload,
  });
};

export const deleteAdminTest = (testId: string) => {
  return request<{ id: string; deleted: boolean }>(`/api/tests/${testId}`, {
    method: "DELETE",
  });
};

export const scheduleTest = (
  testId: string,
  payload: {
    scheduled_start: string;
    scheduled_end: string;
  },
) => {
  return request<AdminTest>(`/api/tests/${testId}/schedule`, {
    method: "PATCH",
    body: payload,
  });
};

export const createSection = (
  testId: string,
  payload: { title: string; order_index: number },
) => {
  return request<{ id: string }>(`/api/tests/${testId}/sections`, {
    method: "POST",
    body: payload,
  });
};

export const addQuestionToSection = (
  sectionId: string,
  payload: { question_id: string },
) => {
  return request<{ id: string }>(`/api/sections/${sectionId}/questions`, {
    method: "POST",
    body: payload,
  });
};

export const getTestSeries = () => {
  return request<AdminTestSeries[]>("/api/tests/series");
};

export const createTestSeries = (payload: {
  series_name: string;
  description?: string;
  exam_type?: string;
  subjects_covered?: string[];
  price?: number;
  visibility: "public" | "private";
  selected_test_ids?: string[];
}) => {
  return request<AdminTestSeries>("/api/tests/series", {
    method: "POST",
    body: payload,
  });
};

export const updateTestSeries = (
  seriesId: string,
  payload: Partial<{
    series_name: string;
    description: string;
    exam_type: string;
    subjects_covered: string[];
    price: number;
    visibility: "public" | "private";
    selected_test_ids: string[];
  }>,
) => {
  return request<AdminTestSeries>(`/api/tests/series/${seriesId}`, {
    method: "PATCH",
    body: payload,
  });
};

export const deleteTestSeries = (seriesId: string) => {
  return request<{ id: string; deleted: boolean }>(`/api/tests/series/${seriesId}`, {
    method: "DELETE",
  });
};

export const getPendingCoachings = () => {
  return request<PendingCoaching[]>("/api/super-admin/coaching/pending");
};

export const approveCoaching = (coachingId: string) => {
  return request<{ id: string; status: "approved" }>(`/api/super-admin/coaching/${coachingId}/approve`, {
    method: "PATCH",
  });
};

export const rejectCoaching = (coachingId: string) => {
  return request<{ id: string; status: "rejected" }>(`/api/super-admin/coaching/${coachingId}/reject`, {
    method: "PATCH",
  });
};

export const getSuperAdminStats = () => {
  return request<SuperAdminStats>("/api/super-admin/dashboard/stats");
};

export const getCoachingManagement = () => {
  return request<CoachingManagementItem[]>("/api/super-admin/coaching");
};

export const getAvailableTests = () => {
  return request<StudentTest[]>("/api/student/tests/available");
};

export const getUpcomingTests = () => {
  return request<StudentTest[]>("/api/student/tests/upcoming");
};

export const getPastTests = () => {
  return request<StudentTest[]>("/api/student/tests/past");
};

export const getDashboardOverview = () => {
  return request<DashboardOverview>("/api/student/dashboard/overview");
};

export const getScheduledTests = () => {
  return request<ScheduledTest[]>("/api/student/scheduled-tests");
};

export const getAttemptHistory = () => {
  return request<AttemptHistoryItem[]>("/api/student/attempt-history");
};

export const getResults = () => {
  return request<ResultListItem[]>("/api/student/results");
};

export const getResultDetail = (resultId: string) => {
  return request<ResultDetail>(`/api/student/results/${resultId}`);
};

export const getPerformanceAnalytics = () => {
  return request<PerformanceAnalytics>("/api/student/analytics");
};

export const getPurchasedTests = () => {
  return request<PurchasedTestSeries[]>("/api/student/my-test-series");
};

export const getExploreTestSeries = () => {
  return request<ExploreTestSeriesItem[]>("/api/student/explore-test-series");
};

export const purchaseTestSeries = (payload: {
  test_series_id: string;
  payment_id: string;
}) => {
  return request<{
    id: string;
    student_id: string;
    test_series_id: string;
    amount_paid: number;
    payment_id: string;
    payment_status: "pending" | "success" | "failed";
    purchase_date: string;
  }>("/api/student/purchases", {
    method: "POST",
    body: payload,
  });
};

export const getMyStudentProfile = () => {
  return request<StudentProfile>("/api/student/profile");
};

export const updateMyStudentProfile = (payload: Partial<{
  name: string;
  phone_number: string;
  exam_preparing_for: string;
  current_password: string;
  new_password: string;
}>) => {
  return request<StudentProfile>("/api/student/profile", {
    method: "PATCH",
    body: payload,
  });
};

export const startExamAttempt = (payload: { testId: string }) => {
  return request<ExamStartResponse>("/api/exam/start", {
    method: "POST",
    body: payload,
  });
};

export const getExamData = (testId: string) => {
  return request<ExamDataResponse>(`/api/exam/${testId}`);
};

export const saveExamAnswer = (payload: SaveExamAnswerPayload) => {
  return request<{
    id: string;
    attempt_id: string;
    question_id: string;
    selected_option: OptionChoice | null;
    is_marked_review: boolean;
    time_spent_seconds: number;
    saved_at: string;
  }>("/api/exam/save-answer", {
    method: "POST",
    body: payload,
  });
};

export const submitExamAttempt = (payload: { attemptId: string }) => {
  return request<ExamSubmitResponse>("/api/exam/submit", {
    method: "POST",
    body: payload,
  });
};

export const getAttemptResultSummary = (attemptId: string) => {
  return request<AttemptResultSummary>(`/api/exam/result/${attemptId}`);
};
