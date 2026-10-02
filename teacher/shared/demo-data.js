/**
 * TrevaForms - Demo Data
 * Seed data for forms, questions, responses, templates, and user profile.
 */

const DEMO_USER = {
    id: "usr_meet_01",
    name: "Meet Shah",
    email: "meet@trevaforms.app",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80",
    role: "Lead Product Designer",
    joinedDate: "January 2026",
    plan: "Pro Plan"
};

const DEMO_SETTINGS = {
    theme: "light",
    notifications: {
        emailResponses: true,
        formPublished: true,
        weeklyDigest: false,
        securityAlerts: true
    },
    privacy: {
        allowAnalytics: true,
        publicProfile: false
    }
};

const DEMO_TEMPLATES = [
    {
        id: "tpl_feedback",
        title: "Student Feedback Form",
        description: "Collect valuable feedback from students about courses, instructors, and campus facilities.",
        category: "Education",
        icon: "graduation-cap",
        badge: "Popular",
        questions: [
            {
                id: "q_tpl_1",
                question: "What is your full name?",
                type: "short-answer",
                required: true,
                placeholder: "e.g. Alex Johnson"
            },
            {
                id: "q_tpl_2",
                question: "Which course are you currently enrolled in?",
                type: "dropdown",
                required: true,
                options: ["Computer Engineering", "Information Technology", "Data Science", "Mechanical Engineering"]
            },
            {
                id: "q_tpl_3",
                question: "How would you rate the clarity of course material?",
                type: "rating",
                required: true,
                maxRating: 5
            },
            {
                id: "q_tpl_4",
                question: "Which learning methods helped you the most?",
                type: "checkboxes",
                required: false,
                options: ["Hands-on Labs", "Video Lectures", "Group Discussions", "Individual Assignments"]
            },
            {
                id: "q_tpl_5",
                question: "Share any additional suggestions or improvements:",
                type: "paragraph",
                required: false,
                placeholder: "Write your feedback here..."
            }
        ]
    },
    {
        id: "tpl_event",
        title: "Event Registration & RSVP",
        description: "Seamless registration form for webinars, workshops, conferences, and meetups.",
        category: "Events",
        icon: "calendar-event",
        badge: "Essential",
        questions: [
            {
                id: "q_tpl_ev1",
                question: "Full Name",
                type: "short-answer",
                required: true,
                placeholder: "John Doe"
            },
            {
                id: "q_tpl_ev2",
                question: "Email Address",
                type: "short-answer",
                required: true,
                placeholder: "john@example.com"
            },
            {
                id: "q_tpl_ev3",
                question: "Will you attend in-person or virtually?",
                type: "multiple-choice",
                required: true,
                options: ["In-Person (San Francisco HQ)", "Virtual (Zoom Live Stream)"]
            },
            {
                id: "q_tpl_ev4",
                question: "Dietary Restrictions / Special Accommodations",
                type: "paragraph",
                required: false,
                placeholder: "e.g. Vegetarian, Gluten-free, Wheelchair access..."
            },
            {
                id: "q_tpl_ev5",
                question: "Preferred Workshop Track",
                type: "dropdown",
                required: true,
                options: ["Track A: AI & Automation", "Track B: UI/UX System Design", "Track C: Backend Scalability"]
            }
        ]
    },
    {
        id: "tpl_customer_csat",
        title: "Customer Satisfaction (CSAT) Survey",
        description: "Measure customer satisfaction score, NPS, and product experience easily.",
        category: "Feedback",
        icon: "heart",
        badge: "High Conversion",
        questions: [
            {
                id: "q_csat_1",
                question: "Overall, how satisfied are you with TrevaForms?",
                type: "rating",
                required: true,
                maxRating: 5
            },
            {
                id: "q_csat_2",
                question: "How likely are you to recommend us to a colleague? (1 = Low, 10 = High)",
                type: "linear-scale",
                required: true,
                scaleMin: 1,
                scaleMax: 10,
                minLabel: "Not likely",
                maxLabel: "Extremely likely"
            },
            {
                id: "q_csat_3",
                question: "What feature do you use most frequently?",
                type: "multiple-choice",
                required: true,
                options: ["Form Builder", "Response Analytics", "Custom Logic", "Templates"]
            },
            {
                id: "q_csat_4",
                question: "What can we do to improve your experience?",
                type: "paragraph",
                required: false
            }
        ]
    },
    {
        id: "tpl_quiz",
        title: "General Knowledge Quiz",
        description: "Engage audience or evaluate students with a quick multiple choice quiz.",
        category: "Quiz",
        icon: "help-circle",
        badge: "Interactive",
        questions: [
            {
                id: "q_quiz_1",
                question: "What does HTML stand for?",
                type: "multiple-choice",
                required: true,
                options: [
                    "HyperText Markup Language",
                    "HighTech Modern Language",
                    "Hyperlink Text Management Protocol",
                    "Home Tool Markup Language"
                ]
            },
            {
                id: "q_quiz_2",
                question: "Which language is primarily used for web page styling?",
                type: "multiple-choice",
                required: true,
                options: ["CSS", "Python", "SQL", "C++"]
            },
            {
                id: "q_quiz_3",
                question: "Select all valid JavaScript data types:",
                type: "checkboxes",
                required: true,
                options: ["String", "Number", "Boolean", "Float", "Symbol"]
            }
        ]
    },
    {
        id: "tpl_job_app",
        title: "Job Application Form",
        description: "Collect candidate resumes, contact information, and portfolio links.",
        category: "Business",
        icon: "briefcase",
        badge: "Pro",
        questions: [
            {
                id: "q_job_1",
                question: "Applicant Full Name",
                type: "short-answer",
                required: true
            },
            {
                id: "q_job_2",
                question: "Position Applied For",
                type: "dropdown",
                required: true,
                options: ["Frontend Engineer", "UI/UX Designer", "Product Manager", "DevOps Engineer"]
            },
            {
                id: "q_job_3",
                question: "Portfolio / GitHub URL",
                type: "short-answer",
                required: true,
                placeholder: "https://github.com/username"
            },
            {
                id: "q_job_4",
                question: "Upload Resume (PDF / DOCX)",
                type: "file-upload",
                required: true
            },
            {
                id: "q_job_5",
                question: "Earliest Available Start Date",
                type: "date",
                required: true
            }
        ]
    },
    {
        id: "tpl_workshop_rsvp",
        title: "Design Systems Workshop RSVP",
        description: "Gather attendees and topic interest for upcoming design workshops.",
        category: "Registration",
        icon: "layout",
        badge: "New",
        questions: [
            {
                id: "q_ws_1",
                question: "Your Name",
                type: "short-answer",
                required: true
            },
            {
                id: "q_ws_2",
                question: "Company / Organization",
                type: "short-answer",
                required: false
            },
            {
                id: "q_ws_3",
                question: "Experience level with Design Tokens",
                type: "linear-scale",
                required: true,
                scaleMin: 1,
                scaleMax: 5,
                minLabel: "Beginner",
                maxLabel: "Expert"
            }
        ]
    }
];

const DEMO_FORMS = [
    {
        id: "form_001",
        title: "Student Feedback Form",
        description: "Tell us about your academic experience, faculty guidance, and course content for the 2026 semester.",
        status: "published",
        createdAt: "2026-09-10T10:00:00.000Z",
        updatedAt: "2026-09-24T14:30:00.000Z",
        responseCount: 1284,
        shareUrl: "trevaforms.app/f/student-feedback",
        questions: [
            {
                id: "q1",
                question: "What is your full name?",
                type: "short-answer",
                required: true,
                placeholder: "Enter your full name"
            },
            {
                id: "q2",
                question: "Which department do you belong to?",
                type: "dropdown",
                required: true,
                options: ["Computer Engineering", "Information Technology", "Mechanical Engineering", "Civil Engineering", "Electronics"]
            },
            {
                id: "q3",
                question: "How satisfied are you with the faculty instructions?",
                type: "rating",
                required: true,
                maxRating: 5
            },
            {
                id: "q4",
                question: "Which topics require additional practical workshops?",
                type: "checkboxes",
                required: false,
                options: ["Web Architecture", "Database Optimization", "UI UX Prototyping", "Cloud Deployment"]
            },
            {
                id: "q5",
                question: "Detailed Feedback or Suggestions",
                type: "paragraph",
                required: false,
                placeholder: "Share your thoughts here..."
            }
        ]
    },
    {
        id: "form_002",
        title: "Event Registration & RSVP",
        description: "Register for the Annual Treva Tech Conference 2026. Limited seats available.",
        status: "published",
        createdAt: "2026-09-12T09:15:00.000Z",
        updatedAt: "2026-09-25T11:20:00.000Z",
        responseCount: 320,
        shareUrl: "trevaforms.app/f/event-registration",
        questions: [
            {
                id: "q201",
                question: "Attendee Full Name",
                type: "short-answer",
                required: true
            },
            {
                id: "q202",
                question: "Work Email",
                type: "short-answer",
                required: true
            },
            {
                id: "q203",
                question: "Attendance Mode",
                type: "multiple-choice",
                required: true,
                options: ["In-Person Keynote", "Live Virtual Stream", "On-Demand Recordings Only"]
            },
            {
                id: "q204",
                question: "Preferred T-Shirt Size",
                type: "dropdown",
                required: true,
                options: ["Small (S)", "Medium (M)", "Large (L)", "Extra Large (XL)"]
            }
        ]
    },
    {
        id: "form_003",
        title: "Workshop RSVP",
        description: "Hands-on Design Systems & Vanilla JS Architecture Workshop.",
        status: "draft",
        createdAt: "2026-09-20T16:00:00.000Z",
        updatedAt: "2026-09-26T08:45:00.000Z",
        responseCount: 32,
        shareUrl: "trevaforms.app/f/workshop-rsvp",
        questions: [
            {
                id: "q301",
                question: "Participant Name",
                type: "short-answer",
                required: true
            },
            {
                id: "q302",
                question: "Current Skill Level",
                type: "linear-scale",
                required: true,
                scaleMin: 1,
                scaleMax: 5,
                minLabel: "Novice",
                maxLabel: "Expert"
            }
        ]
    },
    {
        id: "form_004",
        title: "Customer NPS & CSAT Survey",
        description: "Help us measure our quarterly customer happiness and service efficiency.",
        status: "published",
        createdAt: "2026-08-01T12:00:00.000Z",
        updatedAt: "2026-09-22T17:10:00.000Z",
        responseCount: 540,
        shareUrl: "trevaforms.app/f/customer-nps-csat",
        questions: [
            {
                id: "q401",
                question: "How likely are you to recommend TrevaForms to a friend?",
                type: "linear-scale",
                required: true,
                scaleMin: 1,
                scaleMax: 10,
                minLabel: "Not Likely",
                maxLabel: "Very Likely"
            },
            {
                id: "q402",
                question: "Rate overall software stability",
                type: "rating",
                required: true,
                maxRating: 5
            }
        ]
    },
    {
        id: "form_005",
        title: "Product Feature Request Poll",
        description: "Vote on upcoming features for Q4 roadmap prioritization.",
        status: "published",
        createdAt: "2026-08-15T08:30:00.000Z",
        updatedAt: "2026-09-18T10:00:00.000Z",
        responseCount: 198,
        shareUrl: "trevaforms.app/f/feature-request-poll",
        questions: [
            {
                id: "q501",
                question: "Select top 2 features you want to see next:",
                type: "checkboxes",
                required: true,
                options: ["Supabase Realtime Sync", "PDF Export Reports", "Custom Domain Support", "Zapier Integration"]
            }
        ]
    },
    {
        id: "form_006",
        title: "Internal Team Onboarding Questionnaire",
        description: "Archived onboarding survey for new engineering hires.",
        status: "archived",
        createdAt: "2026-05-10T10:00:00.000Z",
        updatedAt: "2026-07-01T14:00:00.000Z",
        responseCount: 45,
        shareUrl: "trevaforms.app/f/team-onboarding-archived",
        questions: [
            {
                id: "q601",
                question: "Was hardware setup completed on Day 1?",
                type: "multiple-choice",
                required: true,
                options: ["Yes", "No", "Partially"]
            }
        ]
    }
];

// Seed 50+ realistic demo responses for analytics & tables
const DEMO_RESPONSES = [
    {
        id: "resp_1001",
        formId: "form_001",
        formTitle: "Student Feedback Form",
        respondent: "Aarav Sharma",
        email: "aarav.sharma@example.com",
        submittedAt: "2026-09-26T14:20:00.000Z",
        status: "Completed",
        answers: {
            "q1": "Aarav Sharma",
            "q2": "Computer Engineering",
            "q3": 5,
            "q4": ["Web Architecture", "UI UX Prototyping"],
            "q5": "Great lectures on modular JavaScript and clean state management!"
        }
    },
    {
        id: "resp_1002",
        formId: "form_001",
        formTitle: "Student Feedback Form",
        respondent: "Priya Patel",
        email: "priya.p@example.com",
        submittedAt: "2026-09-26T12:05:00.000Z",
        status: "Completed",
        answers: {
            "q1": "Priya Patel",
            "q2": "Information Technology",
            "q3": 4,
            "q4": ["Database Optimization"],
            "q5": "Would love more practice sessions on SQL query tuning."
        }
    },
    {
        id: "resp_1003",
        formId: "form_002",
        formTitle: "Event Registration & RSVP",
        respondent: "Michael Brown",
        email: "michael.b@techcorp.io",
        submittedAt: "2026-09-26T10:45:00.000Z",
        status: "Completed",
        answers: {
            "q201": "Michael Brown",
            "q202": "michael.b@techcorp.io",
            "q203": "In-Person Keynote",
            "q204": "Large (L)"
        }
    },
    {
        id: "resp_1004",
        formId: "form_001",
        formTitle: "Student Feedback Form",
        respondent: "Rohan Verma",
        email: "rohan.v@example.com",
        submittedAt: "2026-09-25T18:30:00.000Z",
        status: "Completed",
        answers: {
            "q1": "Rohan Verma",
            "q2": "Mechanical Engineering",
            "q3": 4,
            "q4": ["Cloud Deployment"],
            "q5": "Course pace is excellent."
        }
    },
    {
        id: "resp_1005",
        formId: "form_003",
        formTitle: "Workshop RSVP",
        respondent: "Sophia Chen",
        email: "sophia.chen@designhub.com",
        submittedAt: "2026-09-25T16:15:00.000Z",
        status: "Completed",
        answers: {
            "q301": "Sophia Chen",
            "q302": 4
        }
    },
    {
        id: "resp_1006",
        formId: "form_002",
        formTitle: "Event Registration & RSVP",
        respondent: "David Miller",
        email: "david.m@innovate.org",
        submittedAt: "2026-09-25T11:00:00.000Z",
        status: "Completed",
        answers: {
            "q201": "David Miller",
            "q202": "david.m@innovate.org",
            "q203": "Live Virtual Stream",
            "q204": "Medium (M)"
        }
    },
    {
        id: "resp_1007",
        formId: "form_004",
        formTitle: "Customer NPS & CSAT Survey",
        respondent: "Elena Rostova",
        email: "elena@globaltech.com",
        submittedAt: "2026-09-24T19:22:00.000Z",
        status: "Completed",
        answers: {
            "q401": 9,
            "q402": 5
        }
    },
    {
        id: "resp_1008",
        formId: "form_001",
        formTitle: "Student Feedback Form",
        respondent: "Ananya Deshmukh",
        email: "ananya.d@univ.edu",
        submittedAt: "2026-09-24T15:10:00.000Z",
        status: "Completed",
        answers: {
            "q1": "Ananya Deshmukh",
            "q2": "Computer Engineering",
            "q3": 5,
            "q4": ["Web Architecture", "Cloud Deployment"],
            "q5": "Top quality faculty!"
        }
    }
];

// Generate synthetic historical response timeline for Chart.js
const DEMO_TIMELINE = {
    labels: ["Sep 19", "Sep 20", "Sep 21", "Sep 22", "Sep 23", "Sep 24", "Sep 25", "Sep 26"],
    data: [42, 68, 95, 110, 145, 180, 210, 260]
};

if (typeof window !== "undefined") {
    window.DEMO_USER = DEMO_USER;
    window.DEMO_SETTINGS = DEMO_SETTINGS;
    window.DEMO_TEMPLATES = DEMO_TEMPLATES;
    window.DEMO_FORMS = DEMO_FORMS;
    window.DEMO_RESPONSES = DEMO_RESPONSES;
    window.DEMO_TIMELINE = DEMO_TIMELINE;
}
if (typeof global !== "undefined") {
    global.DEMO_USER = DEMO_USER;
    global.DEMO_SETTINGS = DEMO_SETTINGS;
    global.DEMO_TEMPLATES = DEMO_TEMPLATES;
    global.DEMO_FORMS = DEMO_FORMS;
    global.DEMO_RESPONSES = DEMO_RESPONSES;
    global.DEMO_TIMELINE = DEMO_TIMELINE;
}

