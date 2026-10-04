import React, { useEffect, useMemo, useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import { auth, db } from "./firebase";
import "./App.css";
const API_URL = "https://learnio-app-txke.onrender.com";
// ======================================================
// HELPERS
// ======================================================

const makeClassCode = () => {
  return `LN-${Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase()}`;
};

const formatDate = (value) => {
  if (!value) return "-";

  try {
    if (value?.toDate) {
      return value.toDate().toLocaleDateString("en-IN");
    }

    return new Date(value).toLocaleDateString("en-IN");
  } catch {
    return "-";
  }
};

const formatDateTime = (value) => {
  if (!value) return "";

  try {
    if (value?.toDate) {
      return value.toDate().toLocaleString("en-IN");
    }

    return new Date(value).toLocaleString("en-IN");
  } catch {
    return "";
  }
};

const getErrorMessage = (error) => {
  const code = error?.code;

  const messages = {
    "auth/invalid-credential":
      "Email or password incorrect aanu.",
    "auth/invalid-email":
      "Valid email enter cheyyuka.",
    "auth/email-already-in-use":
      "Ee email already registered aanu.",
    "auth/weak-password":
      "Password minimum 6 characters venam.",
    "auth/user-not-found":
      "Ee email-inu account illa.",
    "auth/wrong-password":
      "Password incorrect aanu.",
    "auth/too-many-requests":
      "Too many attempts. Kurachu kazhinju try cheyyuka.",
    "auth/network-request-failed":
      "Internet connection check cheyyuka.",
    "permission-denied":
      "Firebase permissions check cheyyuka.",
  };

  return (
    messages[code] ||
    error?.message ||
    "Something went wrong."
  );
};

// ======================================================
// EMPTY FORMS
// ======================================================

const emptyMaterial = {
  title: "",
  subject: "",
  description: "",
  link: "",
};

const emptyAssignment = {
  title: "",
  subject: "",
  description: "",
  dueDate: "",
  points: 10,
};

const emptyGoal = {
  title: "",
  subject: "",
  dueDate: "",
  priority: "Medium",
};

const emptyRevision = {
  subject: "",
  topics: "",
  studyDate: "",
  notes: "",
};

const emptyNote = {
  title: "",
  subject: "",
  content: "",
};

const emptyQuiz = {
  title: "",
  subject: "",
  description: "",
  questions: [
    {
      question: "",
      options: ["", "", "", ""],
      answer: 0,
    },
  ],
};

// ======================================================
// APP
// ======================================================

export default function App() {
  const [screen, setScreen] = useState("loading");
  const [page, setPage] = useState("dashboard");

  const [authUser, setAuthUser] = useState(null);
  const [profile, setProfile] = useState(null);

  const [authMode, setAuthMode] = useState("login");
  const [authMessage, setAuthMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });

  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [pendingRegistration, setPendingRegistration] =
    useState(null);

  // ====================================================
  // DATA
  // ====================================================

  const [users, setUsers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [quizAttempts, setQuizAttempts] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [assignmentSubmissions, setAssignmentSubmissions] =
    useState([]);
  const [goals, setGoals] = useState([]);
  const [revisionPlans, setRevisionPlans] = useState([]);
  const [messages, setMessages] = useState([]);

  // ====================================================
  // MODALS
  // ====================================================

  const [showMaterialModal, setShowMaterialModal] =
    useState(false);

  const [showNoteModal, setShowNoteModal] = useState(false);

  const [showQuizModal, setShowQuizModal] =
    useState(false);

  const [showAssignmentModal, setShowAssignmentModal] =
    useState(false);

  const [showGoalModal, setShowGoalModal] =
    useState(false);

  const [showRevisionModal, setShowRevisionModal] =
    useState(false);

  const [showConnectModal, setShowConnectModal] =
    useState(false);

  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState([]);

  const [selectedAssignment, setSelectedAssignment] =
    useState(null);

  const [assignmentAnswer, setAssignmentAnswer] =
    useState("");

  // ====================================================
  // FORMS
  // ====================================================

  const [materialForm, setMaterialForm] =
    useState(emptyMaterial);

  const [noteForm, setNoteForm] =
    useState(emptyNote);

  const [quizForm, setQuizForm] =
    useState(emptyQuiz);

  const [assignmentForm, setAssignmentForm] =
    useState(emptyAssignment);

  const [goalForm, setGoalForm] =
    useState(emptyGoal);

  const [revisionForm, setRevisionForm] =
    useState(emptyRevision);

  const [connectCode, setConnectCode] = useState("");

  // ====================================================
  // CHAT
  // ====================================================

  const [chatPartner, setChatPartner] =
    useState("");

  const [chatText, setChatText] = useState("");

  // ====================================================
  // AI
  // ====================================================

  const [aiQuestion, setAiQuestion] = useState("");

  const [aiAnswer, setAiAnswer] = useState(
    "Ask me a study question and I will give you a simple explanation."
  );

  // ====================================================
  // SETTINGS
  // ====================================================

  const [settingsName, setSettingsName] = useState("");

  // ====================================================
  // REFRESH
  // ====================================================

  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = () => {
    setRefreshKey((value) => value + 1);
  };

  // ====================================================
  // AUTH LISTENER
  // ====================================================

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        try {
          if (!user) {
            setAuthUser(null);
            setProfile(null);
            setScreen("login");
            return;
          }

          setAuthUser(user);

          const userRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const data = userSnap.data();

            const nextProfile = {
              id: user.uid,
              ...data,
            };

            setProfile(nextProfile);
            setSettingsName(
              data.name ||
                user.displayName ||
                user.email?.split("@")[0] ||
                ""
            );

            setScreen("app");
            setPage("dashboard");
          } else {
            // Existing Firebase account but no profile
            setPendingRegistration({
              name:
                user.displayName ||
                user.email?.split("@")[0] ||
                "User",
              email: user.email || "",
              password: "",
            });

            setScreen("role");
          }
        } catch (error) {
          console.error(error);
          setAuthMessage(getErrorMessage(error));
        } finally {
          setScreen((current) =>
            current === "loading" ? "login" : current
          );
        }
      }
    );

    return () => unsubscribe();
  }, []);

  // ====================================================
  // LOAD ALL DATA
  // ====================================================

  const loadAllData = async () => {
    if (!authUser || !profile) return;

    try {
      const [
        usersSnap,
        classesSnap,
        materialsSnap,
        quizzesSnap,
        attemptsSnap,
        assignmentsSnap,
        submissionsSnap,
        goalsSnap,
        revisionSnap,
        messagesSnap,
      ] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "classes")),
        getDocs(collection(db, "materials")),
        getDocs(collection(db, "quizzes")),
        getDocs(collection(db, "quizAttempts")),
        getDocs(collection(db, "assignments")),
        getDocs(collection(db, "assignmentSubmissions")),
        getDocs(collection(db, "goals")),
        getDocs(collection(db, "revisionPlans")),
        getDocs(collection(db, "messages")),
      ]);

      setUsers(
        usersSnap.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }))
      );

      setClasses(
        classesSnap.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }))
      );

      setMaterials(
        materialsSnap.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }))
      );

      setQuizzes(
        quizzesSnap.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }))
      );

      setQuizAttempts(
        attemptsSnap.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }))
      );

      setAssignments(
        assignmentsSnap.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }))
      );

      setAssignmentSubmissions(
        submissionsSnap.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }))
      );

      setGoals(
        goalsSnap.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }))
      );

      setRevisionPlans(
        revisionSnap.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }))
      );

      setMessages(
        messagesSnap.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }))
      );
    } catch (error) {
      console.error("LOAD DATA ERROR:", error);
      setAuthMessage(getErrorMessage(error));
    }
  };

  useEffect(() => {
    if (!authUser || !profile) return;

    loadAllData();
  }, [authUser, profile, refreshKey]);

  // ====================================================
  // AUTOMATIC TEACHER CLASS
  // ====================================================

  useEffect(() => {
    const createTeacherClass = async () => {
      if (!profile || profile.role !== "teacher") {
        return;
      }

      try {
        const teacherUid = profile.uid || profile.id;

        const classQuery = query(
          collection(db, "classes"),
          where("teacherId", "==", teacherUid)
        );

        const classSnap = await getDocs(classQuery);

        // Existing class
        if (!classSnap.empty) {
          const existingClass = {
            id: classSnap.docs[0].id,
            ...classSnap.docs[0].data(),
          };

          setClasses((previous) => {
            const exists = previous.some(
              (item) => item.id === existingClass.id
            );

            if (exists) {
              return previous.map((item) =>
                item.id === existingClass.id
                  ? existingClass
                  : item
              );
            }

            return [...previous, existingClass];
          });

          return;
        }

        // Create class
        const newCode = makeClassCode();

        const classRef = await addDoc(
          collection(db, "classes"),
          {
            code: newCode,
            teacherId: teacherUid,
            teacherName: profile.name || "Teacher",
            studentIds: [],
            createdAt: serverTimestamp(),
          }
        );

        const newClass = {
          id: classRef.id,
          code: newCode,
          teacherId: teacherUid,
          teacherName: profile.name || "Teacher",
          studentIds: [],
        };

        setClasses((previous) => [
          ...previous,
          newClass,
        ]);
      } catch (error) {
        console.error(
          "TEACHER CLASS ERROR:",
          error
        );

        setAuthMessage(getErrorMessage(error));
      }
    };

    createTeacherClass();
  }, [profile]);

  
  // ====================================================
  // REGISTER

  const handleRegister = async (event) => {
    event.preventDefault();

    setAuthMessage("");

    if (!registerForm.name.trim()) {
      setAuthMessage("Name enter cheyyuka.");
      return;
    }

    if (!registerForm.email.trim()) {
      setAuthMessage("Email enter cheyyuka.");
      return;
    }

    if (registerForm.password.length < 6) {
      setAuthMessage(
        "Password minimum 6 characters venam."
      );
      return;
    }

    setPendingRegistration({
      name: registerForm.name.trim(),
      email: registerForm.email.trim(),
      password: registerForm.password,
    });

    setScreen("role");
  };

  // ====================================================
  // CHOOSE ROLE
  // ====================================================

  const chooseRole = async (role) => {
    setLoading(true);
    setAuthMessage("");

    try {
      let user = auth.currentUser;

      // New registration
      if (!user && pendingRegistration) {
        const result =
          await createUserWithEmailAndPassword(
            auth,
            pendingRegistration.email,
            pendingRegistration.password
          );

        user = result.user;

        await updateProfile(user, {
          displayName:
            pendingRegistration.name,
        });
      }

      if (!user) {
        throw new Error(
          "User account not found."
        );
      }

      const profileData = {
        uid: user.uid,
        name:
          pendingRegistration?.name ||
          user.displayName ||
          user.email?.split("@")[0] ||
          "User",
        email: user.email || "",
        role,
        department: "",
        accessCode: "",
        teacherIds: [],
        studentIds: [],
        createdAt: serverTimestamp(),
      };

      await setDoc(
        doc(db, "users", user.uid),
        profileData,
        { merge: true }
      );

      const userSnap = await getDoc(
        doc(db, "users", user.uid)
      );

      const finalData = userSnap.exists()
        ? userSnap.data()
        : profileData;

      setAuthUser(user);

      setProfile({
        id: user.uid,
        ...finalData,
      });

      setSettingsName(
        finalData.name || ""
      );

      setPendingRegistration(null);

      setScreen("app");
      setPage("dashboard");
    } catch (error) {
      console.error("ROLE ERROR:", error);
      setAuthMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  // ====================================================
  // LOGOUT
  // ====================================================

  const handleLogout = async () => {
    await signOut(auth);

    setAuthUser(null);
    setProfile(null);

    setScreen("login");
    setPage("dashboard");
  };
const handleLogin = async (event) => {
  event.preventDefault();

  setLoading(true);
  setAuthMessage("");

  try {
    const email = loginForm.email.trim();
    const password = loginForm.password;

    if (!email || !password) {
      setAuthMessage(
        "Email and password enter cheyyuka."
      );
      return;
    }

    const result = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    const user = result.user;

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();

      setAuthUser(user);

      setProfile({
        id: user.uid,
        ...userData,
      });

      setSettingsName(userData.name || "");

      setScreen("app");
      setPage("dashboard");

      setLoginForm({
        email: "",
        password: "",
      });

      return;
    }

    setAuthUser(user);

    setPendingRegistration({
      name:
        user.displayName ||
        user.email?.split("@")[0] ||
        "User",
      email: user.email || email,
      password: "",
    });

    setScreen("role");

  } catch (error) {
    console.error("LOGIN ERROR:", error);
    setAuthMessage(getErrorMessage(error));
  } finally {
    setLoading(false);
  }
};
  // ====================================================
  // CLASS
  // ====================================================

  const teacherClass = useMemo(() => {
    if (!profile || profile.role !== "teacher") {
      return null;
    }

    const teacherUid =
      profile.uid || profile.id;

    return (
      classes.find(
        (item) => item.teacherId === teacherUid
      ) || null
    );
  }, [classes, profile]);

  // ====================================================
  // CONNECTED USERS
  // ====================================================

  const connectedTeachers = useMemo(() => {
    if (!profile?.teacherIds?.length) {
      return [];
    }

    return users.filter((item) =>
      profile.teacherIds.includes(
        item.uid || item.id
      )
    );
  }, [users, profile]);

  const connectedStudents = useMemo(() => {
    if (!profile?.studentIds?.length) {
      return [];
    }

    return users.filter((item) =>
      profile.studentIds.includes(
        item.uid || item.id
      )
    );
  }, [users, profile]);

  // ====================================================
  // VISIBLE DATA
  // ====================================================

  const visibleMaterials = useMemo(() => {
    if (!profile) return [];

    if (profile.role === "teacher") {
      return materials.filter(
        (item) =>
          item.teacherId ===
          (profile.uid || profile.id)
      );
    }

    const teacherIds =
      profile.teacherIds || [];

    return materials.filter(
      (item) =>
        teacherIds.includes(item.teacherId) ||
        item.ownerId === profile.id
    );
  }, [materials, profile]);

  const visibleQuizzes = useMemo(() => {
    if (!profile) return [];

    if (profile.role === "teacher") {
      return quizzes.filter(
        (item) =>
          item.teacherId ===
          (profile.uid || profile.id)
      );
    }

    return quizzes.filter((item) =>
      (profile.teacherIds || []).includes(
        item.teacherId
      )
    );
  }, [quizzes, profile]);

  const visibleAssignments = useMemo(() => {
    if (!profile) return [];

    if (profile.role === "teacher") {
      return assignments.filter(
        (item) =>
          item.teacherId ===
          (profile.uid || profile.id)
      );
    }

    return assignments.filter((item) =>
      (profile.teacherIds || []).includes(
        item.teacherId
      )
    );
  }, [assignments, profile]);

  const visibleGoals = useMemo(() => {
    if (!profile) return [];

    return goals.filter(
      (item) => item.studentId === profile.id
    );
  }, [goals, profile]);

  const visibleRevisionPlans = useMemo(() => {
    if (!profile) return [];

    return revisionPlans.filter(
      (item) => item.studentId === profile.id
    );
  }, [revisionPlans, profile]);

  const visibleAttempts = useMemo(() => {
    if (!profile) return [];

    if (profile.role === "student") {
      return quizAttempts.filter(
        (item) => item.studentId === profile.id
      );
    }

    return quizAttempts.filter(
      (item) =>
        item.teacherId ===
        (profile.uid || profile.id)
    );
  }, [quizAttempts, profile]);

  // ====================================================
  // SAVE MATERIAL
  // ====================================================

  const saveMaterial = async (event) => {
    event.preventDefault();

    if (!materialForm.title.trim()) {
      alert("Material title enter cheyyuka.");
      return;
    }

    try {
      await addDoc(
        collection(db, "materials"),
        {
          title: materialForm.title.trim(),
          subject:
            materialForm.subject.trim(),
          description:
            materialForm.description.trim(),
          link: materialForm.link.trim(),

          teacherId:
            profile.role === "teacher"
              ? profile.uid || profile.id
              : "",

          ownerId:
            profile.role === "student"
              ? profile.id
              : "",

          ownerName:
            profile.name || "",

          type: "Learning Material",

          createdAt: serverTimestamp(),
        }
      );

      setMaterialForm(emptyMaterial);
      setShowMaterialModal(false);

      refresh();

      alert("Material saved successfully.");
    } catch (error) {
      alert(getErrorMessage(error));
    }
  };

  // ====================================================
  // SAVE NOTE
  // ====================================================

  const saveStudentNote = async (event) => {
    event.preventDefault();

    if (!noteForm.title.trim()) {
      alert("Note title enter cheyyuka.");
      return;
    }

    try {
      await addDoc(
        collection(db, "materials"),
        {
          title: noteForm.title.trim(),
          subject:
            noteForm.subject.trim(),
          description:
            noteForm.content.trim(),
          link: "",
          teacherId: "",
          ownerId: profile.id,
          ownerName:
            profile.name || "Student",
          type: "Student Note",
          createdAt: serverTimestamp(),
        }
      );

      setNoteForm(emptyNote);
      setShowNoteModal(false);

      refresh();

      alert("Note saved successfully.");
    } catch (error) {
      alert(getErrorMessage(error));
    }
  };

  // ====================================================
  // QUIZ
  // ====================================================

  const updateQuestion = (
    questionIndex,
    field,
    value
  ) => {
    setQuizForm((previous) => {
      const questions = [
        ...previous.questions,
      ];

      questions[questionIndex] = {
        ...questions[questionIndex],
        [field]: value,
      };

      return {
        ...previous,
        questions,
      };
    });
  };

  const updateOption = (
    questionIndex,
    optionIndex,
    value
  ) => {
    setQuizForm((previous) => {
      const questions = [
        ...previous.questions,
      ];

      const options = [
        ...questions[questionIndex].options,
      ];

      options[optionIndex] = value;

      questions[questionIndex] = {
        ...questions[questionIndex],
        options,
      };

      return {
        ...previous,
        questions,
      };
    });
  };

  const addQuizQuestion = () => {
    setQuizForm((previous) => ({
      ...previous,
      questions: [
        ...previous.questions,
        {
          question: "",
          options: ["", "", "", ""],
          answer: 0,
        },
      ],
    }));
  };

  const removeQuizQuestion = (index) => {
    if (quizForm.questions.length <= 1) {
      return;
    }

    setQuizForm((previous) => ({
      ...previous,
      questions:
        previous.questions.filter(
          (_, itemIndex) =>
            itemIndex !== index
        ),
    }));
  };

  const saveQuiz = async (event) => {
    event.preventDefault();

    if (!quizForm.title.trim()) {
      alert("Quiz title enter cheyyuka.");
      return;
    }

    const validQuestions =
      quizForm.questions.filter(
        (item) =>
          item.question.trim() &&
          item.options.every(
            (option) => option.trim()
          )
      );

    if (!validQuestions.length) {
      alert(
        "At least one complete question add cheyyuka."
      );
      return;
    }

    try {
      await addDoc(
        collection(db, "quizzes"),
        {
          title: quizForm.title.trim(),
          subject:
            quizForm.subject.trim(),
          description:
            quizForm.description.trim(),
          teacherId:
            profile.uid || profile.id,
          teacherName:
            profile.name || "Teacher",
          questions: validQuestions,
          createdAt: serverTimestamp(),
        }
      );

      setQuizForm(emptyQuiz);
      setShowQuizModal(false);

      refresh();

      alert("Quiz published.");
    } catch (error) {
      alert(getErrorMessage(error));
    }
  };

  const startQuiz = (quiz) => {
    setSelectedQuiz(quiz);

    setQuizAnswers(
      new Array(
        quiz.questions?.length || 0
      ).fill(null)
    );
  };

  const submitQuiz = async () => {
    if (!selectedQuiz) return;

    const questions =
      selectedQuiz.questions || [];

    let score = 0;

    questions.forEach(
      (question, index) => {
        if (
          quizAnswers[index] ===
          question.answer
        ) {
          score++;
        }
      }
    );

    const total = questions.length;

    const percentage = total
      ? Math.round(
          (score / total) * 100
        )
      : 0;

    try {
      await addDoc(
        collection(db, "quizAttempts"),
        {
          quizId: selectedQuiz.id,
          quizTitle:
            selectedQuiz.title,
          studentId: profile.id,
          studentName:
            profile.name || "Student",
          teacherId:
            selectedQuiz.teacherId,
          score,
          total,
          percentage,
          answers: quizAnswers,
          submittedAt:
            serverTimestamp(),
        }
      );

      alert(
        `Quiz submitted!\nScore: ${score}/${total}\nPercentage: ${percentage}%`
      );

      setSelectedQuiz(null);
      setQuizAnswers([]);

      refresh();
    } catch (error) {
      alert(getErrorMessage(error));
    }
  };

  // ====================================================
  // ASSIGNMENTS
  // ====================================================

  const saveAssignment = async (event) => {
    event.preventDefault();

    if (!assignmentForm.title.trim()) {
      alert(
        "Assignment title enter cheyyuka."
      );
      return;
    }

    try {
      await addDoc(
        collection(db, "assignments"),
        {
          title:
            assignmentForm.title.trim(),
          subject:
            assignmentForm.subject.trim(),
          description:
            assignmentForm.description.trim(),
          dueDate:
            assignmentForm.dueDate,
          points:
            Number(
              assignmentForm.points
            ) || 10,
          teacherId:
            profile.uid || profile.id,
          teacherName:
            profile.name || "Teacher",
          createdAt:
            serverTimestamp(),
        }
      );

      setAssignmentForm(
        emptyAssignment
      );

      setShowAssignmentModal(false);

      refresh();

      alert(
        "Assignment published."
      );
    } catch (error) {
      alert(getErrorMessage(error));
    }
  };

  const openAssignment = (
    assignment
  ) => {
    setSelectedAssignment(assignment);

    const existing =
      assignmentSubmissions.find(
        (item) =>
          item.assignmentId ===
            assignment.id &&
          item.studentId === profile.id
      );

    setAssignmentAnswer(
      existing?.answer || ""
    );
  };

  const submitAssignment = async () => {
    if (!selectedAssignment) return;

    if (!assignmentAnswer.trim()) {
      alert(
        "Answer ezhuthi submit cheyyuka."
      );
      return;
    }

    try {
      const existing =
        assignmentSubmissions.find(
          (item) =>
            item.assignmentId ===
              selectedAssignment.id &&
            item.studentId === profile.id
        );

      if (existing) {
        await updateDoc(
          doc(
            db,
            "assignmentSubmissions",
            existing.id
          ),
          {
            answer:
              assignmentAnswer.trim(),
            submittedAt:
              serverTimestamp(),
            status: "Submitted",
          }
        );
      } else {
        await addDoc(
          collection(
            db,
            "assignmentSubmissions"
          ),
          {
            assignmentId:
              selectedAssignment.id,
            assignmentTitle:
              selectedAssignment.title,
            studentId: profile.id,
            studentName:
              profile.name ||
              "Student",
            teacherId:
              selectedAssignment.teacherId,
            answer:
              assignmentAnswer.trim(),
            score: null,
            status: "Submitted",
            submittedAt:
              serverTimestamp(),
          }
        );
      }

      alert(
        "Assignment submitted successfully."
      );

      setSelectedAssignment(null);
      setAssignmentAnswer("");

      refresh();
    } catch (error) {
      alert(getErrorMessage(error));
    }
  };

  // ====================================================
  // GOALS
  // ====================================================

  const saveGoal = async (event) => {
    event.preventDefault();

    if (!goalForm.title.trim()) {
      alert("Goal enter cheyyuka.");
      return;
    }

    try {
      await addDoc(
        collection(db, "goals"),
        {
          studentId: profile.id,
          title:
            goalForm.title.trim(),
          subject:
            goalForm.subject.trim(),
          dueDate:
            goalForm.dueDate,
          priority:
            goalForm.priority,
          completed: false,
          createdAt:
            serverTimestamp(),
        }
      );

      setGoalForm(emptyGoal);
      setShowGoalModal(false);

      refresh();

      alert("Goal added.");
    } catch (error) {
      alert(getErrorMessage(error));
    }
  };

  const toggleGoal = async (goal) => {
    try {
      await updateDoc(
        doc(db, "goals", goal.id),
        {
          completed:
            !goal.completed,
        }
      );

      refresh();
    } catch (error) {
      alert(getErrorMessage(error));
    }
  };

  // ====================================================
  // REVISION
  // ====================================================

  const saveRevision = async (event) => {
    event.preventDefault();

    if (!revisionForm.subject.trim()) {
      alert("Subject enter cheyyuka.");
      return;
    }

    if (!revisionForm.topics.trim()) {
      alert("Topics enter cheyyuka.");
      return;
    }

    try {
      await addDoc(
        collection(db, "revisionPlans"),
        {
          studentId: profile.id,
          subject:
            revisionForm.subject.trim(),
          topics:
            revisionForm.topics.trim(),
          studyDate:
            revisionForm.studyDate,
          notes:
            revisionForm.notes.trim(),
          status: "Planned",
          createdAt:
            serverTimestamp(),
        }
      );

      setRevisionForm(emptyRevision);
      setShowRevisionModal(false);

      refresh();

      alert("Revision plan saved.");
    } catch (error) {
      alert(getErrorMessage(error));
    }
  };

  const completeRevision = async (
    plan
  ) => {
    try {
      await updateDoc(
        doc(
          db,
          "revisionPlans",
          plan.id
        ),
        {
          status:
            plan.status === "Completed"
              ? "Planned"
              : "Completed",
        }
      );

      refresh();
    } catch (error) {
      alert(getErrorMessage(error));
    }
  };

  // ====================================================
  // CONNECT TEACHER
  // ====================================================

  const connectTeacher = async (
    event
  ) => {
    event.preventDefault();

    const code =
      connectCode.trim().toUpperCase();

    if (!code) {
      alert("Class code enter cheyyuka.");
      return;
    }

    try {
      const classQuery = query(
        collection(db, "classes"),
        where("code", "==", code)
      );

      const result = await getDocs(
        classQuery
      );

      if (result.empty) {
        alert("Class code not found.");
        return;
      }

      const classDoc = result.docs[0];
      const classData = classDoc.data();

      const teacherUid =
        classData.teacherId;

      if (!teacherUid) {
        alert(
          "This class has no teacher ID."
        );
        return;
      }

      await setDoc(
        doc(db, "users", profile.id),
        {
          teacherIds:
            arrayUnion(teacherUid),
        },
        { merge: true }
      );

      await setDoc(
        doc(db, "users", teacherUid),
        {
          studentIds:
            arrayUnion(profile.id),
        },
        { merge: true }
      );

      await updateDoc(
        doc(
          db,
          "classes",
          classDoc.id
        ),
        {
          studentIds:
            arrayUnion(profile.id),
        }
      );

      setProfile((previous) => ({
        ...previous,
        teacherIds: Array.from(
          new Set([
            ...(previous.teacherIds || []),
            teacherUid,
          ])
        ),
      }));

      setConnectCode("");
      setShowConnectModal(false);

      refresh();

      alert(
        `Connected to ${
          classData.teacherName ||
          "Teacher"
        } successfully.`
      );
    } catch (error) {
      console.error(error);
      alert(getErrorMessage(error));
    }
  };

  // ====================================================
  // CHAT
  // ====================================================

  const chatPartners =
    profile?.role === "teacher"
      ? connectedStudents
      : connectedTeachers;

  const visibleMessages = useMemo(() => {
    if (!profile || !chatPartner) {
      return [];
    }

    return messages
      .filter(
        (message) =>
          (message.fromUid ===
            profile.id &&
            message.toUid ===
              chatPartner) ||
          (message.fromUid ===
            chatPartner &&
            message.toUid ===
              profile.id)
      )
      .sort((a, b) => {
        const aTime =
          a.createdAt?.seconds || 0;

        const bTime =
          b.createdAt?.seconds || 0;

        return aTime - bTime;
      });
  }, [
    messages,
    profile,
    chatPartner,
  ]);

  const sendMessage = async (
    event
  ) => {
    event.preventDefault();

    if (!chatPartner) {
      alert("Person select cheyyuka.");
      return;
    }

    if (!chatText.trim()) {
      return;
    }

    const target = users.find(
      (item) =>
        (item.uid || item.id) ===
        chatPartner
    );

    try {
      await addDoc(
        collection(db, "messages"),
        {
          fromUid: profile.id,
          fromName:
            profile.name || "User",
          toUid: chatPartner,
          toName:
            target?.name || "User",
          text: chatText.trim(),
          createdAt:
            serverTimestamp(),
        }
      );

      setChatText("");
      refresh();
    } catch (error) {
      alert(getErrorMessage(error));
    }
  };

  // ====================================================
  // SETTINGS
  // ====================================================

  const saveSettings = async (
    event
  ) => {
    event.preventDefault();

    if (!settingsName.trim()) {
      alert("Name cannot be empty.");
      return;
    }

    try {
      await setDoc(
        doc(db, "users", profile.id),
        {
          name:
            settingsName.trim(),
        },
        { merge: true }
      );

      if (auth.currentUser) {
        await updateProfile(
          auth.currentUser,
          {
            displayName:
              settingsName.trim(),
          }
        );
      }

      setProfile((previous) => ({
        ...previous,
        name: settingsName.trim(),
      }));

      alert("Profile updated.");
    } catch (error) {
      alert(getErrorMessage(error));
    }
  };

  // ====================================================
  // AI
  // ====================================================

  const askAI = () => {
    const question =
      aiQuestion.trim().toLowerCase();

    if (!question) {
      setAiAnswer(
        "Please type your doubt first."
      );
      return;
    }

    if (
      question.includes("html") ||
      question.includes("web")
    ) {
      setAiAnswer(
        "HTML websiteinte structure create cheyyan use cheyyunnu. Simple aayi paranjal HTML is the skeleton of a webpage."
      );
      return;
    }

    if (
      question.includes("java") ||
      question.includes("oop") ||
      question.includes("oops")
    ) {
      setAiAnswer(
        "OOP means Object-Oriented Programming. Main concepts are class, object, inheritance, polymorphism, abstraction and encapsulation."
      );
      return;
    }

    if (
      question.includes("database") ||
      question.includes("dbms")
    ) {
      setAiAnswer(
        "Database is an organized collection of data. DBMS helps us store, update, manage and retrieve that data."
      );
      return;
    }

    if (
      question.includes("python") ||
      question.includes("machine learning")
    ) {
      setAiAnswer(
        "Python is commonly used for machine learning because libraries like NumPy, pandas and scikit-learn make data processing and model building easier."
      );
      return;
    }

    setAiAnswer(
      "Try breaking your doubt into smaller parts. First understand the definition, then one simple example, and finally practice it."
    );
  };

  // ====================================================
  // DASHBOARD STATS
  // ====================================================

  const completionRate = useMemo(() => {
    if (!visibleGoals.length) return 0;

    const completed =
      visibleGoals.filter(
        (goal) => goal.completed
      ).length;

    return Math.round(
      (completed /
        visibleGoals.length) *
        100
    );
  }, [visibleGoals]);

  const averageScore = useMemo(() => {
    if (!visibleAttempts.length) {
      return 0;
    }

    const total =
      visibleAttempts.reduce(
        (sum, attempt) =>
          sum +
          Number(
            attempt.percentage || 0
          ),
        0
      );

    return Math.round(
      total / visibleAttempts.length
    );
  }, [visibleAttempts]);

  // ====================================================
  // LOADING
  // ====================================================

  if (screen === "loading") {
    return (
      <div className="loading-screen">
        <div className="loading-logo">
          L
        </div>

        <h2>Learnio</h2>

        <p>
          Loading your learning space...
        </p>
      </div>
    );
  }

  // ====================================================
  // LOGIN / REGISTER
  // ====================================================

  if (
    screen === "login" ||
    screen === "register"
  ) {
    const isRegister =
      screen === "register";

    return (
      <div className="auth-page">
        <div className="auth-brand-panel">
          <div>
            <div className="brand-mark large">
              L
            </div>

            <p className="eyebrow">
              SMART LEARNING PLATFORM
            </p>

            <h1>
              Learn smarter.
              <br />
              Grow faster.
            </h1>

            <p className="auth-description">
              Learnio brings teachers and
              students together in one simple
              learning space.
            </p>
          </div>
        </div>

        <div className="auth-card-wrap">
          <div className="auth-card">
            <div className="auth-heading">
              <span className="soft-label">
                {isRegister
                  ? "CREATE ACCOUNT"
                  : "WELCOME BACK"}
              </span>

              <h2>
                {isRegister
                  ? "Create your account"
                  : "Welcome to Learnio"}
              </h2>

              <p>
                {isRegister
                  ? "Create your learning profile."
                  : "Sign in and continue learning."}
              </p>
            </div>

            {authMessage && (
              <div className="alert-box">
                {authMessage}
              </div>
            )}

            {isRegister ? (
              <form
                className="auth-form"
                onSubmit={handleRegister}
              >
                <label>
                  Name
                  <input
                    type="text"
                    value={
                      registerForm.name
                    }
                    onChange={(e) =>
                      setRegisterForm({
                        ...registerForm,
                        name: e.target.value,
                      })
                    }
                    placeholder="Your name"
                  />
                </label>

                <label>
                  Email
                  <input
                    type="email"
                    value={
                      registerForm.email
                    }
                    onChange={(e) =>
                      setRegisterForm({
                        ...registerForm,
                        email:
                          e.target.value,
                      })
                    }
                    placeholder="you@example.com"
                  />
                </label>

                <label>
                  Password
                  <input
                    type="password"
                    value={
                      registerForm.password
                    }
                    onChange={(e) =>
                      setRegisterForm({
                        ...registerForm,
                        password:
                          e.target.value,
                      })
                    }
                    placeholder="Minimum 6 characters"
                  />
                </label>

                <button className="primary-btn full">
                  Continue
                </button>
              </form>
            ) : (
              <form
                className="auth-form"
                onSubmit={handleLogin}
              >
                <label>
                  Email
                  <input
                    type="email"
                    value={
                      loginForm.email
                    }
                    onChange={(e) =>
                      setLoginForm({
                        ...loginForm,
                        email:
                          e.target.value,
                      })
                    }
                    placeholder="you@example.com"
                  />
                </label>

                <label>
                  Password
                  <input
                    type="password"
                    value={
                      loginForm.password
                    }
                    onChange={(e) =>
                      setLoginForm({
                        ...loginForm,
                        password:
                          e.target.value,
                      })
                    }
                    placeholder="Your password"
                  />
                </label>

                <button
                  className="primary-btn full"
                  disabled={loading}
                >
                  {loading
                    ? "Signing in..."
                    : "Sign in"}
                </button>
              </form>
            )}

            <div className="auth-switch">
              {isRegister ? (
                <>
                  Already have an account?
                  <button
                    onClick={() => {
                      setAuthMessage("");
                      setScreen("login");
                    }}
                  >
                    Sign in
                  </button>
                </>
              ) : (
                <>
                  New to Learnio?
                  <button
                    onClick={() => {
                      setAuthMessage("");
                      setScreen("register");
                    }}
                  >
                    Create account
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ====================================================
  // ROLE
  // ====================================================

  if (screen === "role") {
    return (
      <div className="role-page">
        <div className="role-container">
          <div className="role-head">
            <div className="brand-inline">
              <div className="brand-mark">
                L
              </div>

              <div>
                <strong>
                  Learnio
                </strong>

                <span>
                  Learning made simple
                </span>
              </div>
            </div>
          </div>

          <div className="role-content">
            <span className="soft-label">
              YOUR ROLE
            </span>

            <h1>
              How will you use Learnio?
            </h1>

            <p>
              Choose your role to open the
              right workspace.
            </p>

            <div className="role-grid">
              <button
                className="role-card"
                onClick={() =>
                  chooseRole("student")
                }
                disabled={loading}
              >
                <div className="role-icon">
                  🎓
                </div>

                <div>
                  <h3>
                    Student
                  </h3>

                  <p>
                    Study materials, quizzes,
                    assignments, goals and
                    revision.
                  </p>
                </div>

                <span className="role-arrow">
                  →
                </span>
              </button>

              <button
                className="role-card"
                onClick={() =>
                  chooseRole("teacher")
                }
                disabled={loading}
              >
                <div className="role-icon">
                  👨‍🏫
                </div>

                <div>
                  <h3>
                    Teacher
                  </h3>

                  <p>
                    Manage classes, share
                    materials and create
                    assessments.
                  </p>
                </div>

                <span className="role-arrow">
                  →
                </span>
              </button>
            </div>

            {authMessage && (
              <div className="alert-box center">
                {authMessage}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ====================================================
  // NAVIGATION
  // ====================================================

  const studentNav = [
    ["dashboard", "⌂", "Overview"],
    ["teachers", "👥", "My Teachers"],
    ["materials", "📚", "Materials"],
    ["quizzes", "📝", "Quizzes"],
    ["assignments", "📌", "Assignments"],
    ["goals", "🎯", "Study Goals"],
    ["revision", "🔄", "Revision Plan"],
    ["ai", "✨", "AI Doubt Assistant"],
    ["chat", "💬", "Teacher Chat"],
    ["performance", "📈", "Performance"],
  ];

  const teacherNav = [
    ["dashboard", "⌂", "Overview"],
    ["class", "🏫", "My Class"],
    ["materials", "📚", "Materials"],
    ["quizzes", "📝", "Quizzes"],
    ["assignments", "📌", "Assignments"],
    ["students", "👥", "Students"],
    ["reports", "📊", "Reports"],
    ["chat", "💬", "Student Chat"],
  ];

  const nav =
    profile?.role === "teacher"
      ? teacherNav
      : studentNav;

  // ====================================================
  // PAGE TITLE
  // ====================================================

  const currentPageTitle =
    nav.find(
      (item) => item[0] === page
    )?.[2] || "Learnio";

  // ====================================================
  // PAGE CONTENT
  // ====================================================

  const renderPage = () => {
    // ==================================================
    // DASHBOARD
    // ==================================================

    if (page === "dashboard") {
      if (profile.role === "teacher") {
        return (
          <TeacherDashboard
            profile={profile}
            teacherClass={
              teacherClass
            }
            students={
              connectedStudents
            }
            materials={
              visibleMaterials
            }
            quizzes={
              visibleQuizzes
            }
            assignments={
              visibleAssignments
            }
            setPage={setPage}
          />
        );
      }

      return (
        <StudentDashboard
          profile={profile}
          teachers={
            connectedTeachers
          }
          materials={
            visibleMaterials
          }
          quizzes={
            visibleQuizzes
          }
          assignments={
            visibleAssignments
          }
          goals={visibleGoals}
          completionRate={
            completionRate
          }
          averageScore={
            averageScore
          }
          setPage={setPage}
          setShowGoalModal={
            setShowGoalModal
          }
        />
      );
    }

    // ==================================================
    // CLASS
    // ==================================================

    if (page === "class") {
      return (
        <TeacherClassPage
          teacherClass={
            teacherClass
          }
          students={
            connectedStudents
          }
          setPage={setPage}
        />
      );
    }

    // ==================================================
    // STUDENTS
    // ==================================================

    if (page === "students") {
      return (
        <TeacherStudentsPage
          students={
            connectedStudents
          }
          teacherClass={
            teacherClass
          }
        />
      );
    }

    // ==================================================
    // REPORTS
    // ==================================================

    if (page === "reports") {
      return (
        <ReportsPage
          students={
            connectedStudents
          }
          attempts={
            visibleAttempts
          }
          submissions={
            assignmentSubmissions.filter(
              (item) =>
                item.teacherId ===
                (profile.uid ||
                  profile.id)
            )
          }
        />
      );
    }

    // ==================================================
    // TEACHERS
    // ==================================================

    if (page === "teachers") {
      return (
        <TeachersPage
          teachers={
            connectedTeachers
          }
          setShowConnectModal={
            setShowConnectModal
          }
        />
      );
    }

    // ==================================================
    // MATERIALS
    // ==================================================

    if (page === "materials") {
      return (
        <MaterialsPage
          role={
            profile.role
          }
          materials={
            visibleMaterials
          }
          profile={profile}
          setShowMaterialModal={
            setShowMaterialModal
          }
          setShowNoteModal={
            setShowNoteModal
          }
        />
      );
    }

    // ==================================================
    // QUIZZES
    // ==================================================

    if (page === "quizzes") {
      return (
        <QuizzesPage
          role={
            profile.role
          }
          quizzes={
            visibleQuizzes
          }
          attempts={
            visibleAttempts
          }
          setShowQuizModal={
            setShowQuizModal
          }
          startQuiz={
            startQuiz
          }
        />
      );
    }

    // ==================================================
    // ASSIGNMENTS
    // ==================================================

    if (
      page === "assignments"
    ) {
      return (
        <AssignmentsPage
          role={
            profile.role
          }
          assignments={
            visibleAssignments
          }
          submissions={
            assignmentSubmissions
          }
          profile={profile}
          setShowAssignmentModal={
            setShowAssignmentModal
          }
          openAssignment={
            openAssignment
          }
        />
      );
    }

    // ==================================================
    // GOALS
    // ==================================================

    if (page === "goals") {
      return (
        <GoalsPage
          goals={visibleGoals}
          setShowGoalModal={
            setShowGoalModal
          }
          toggleGoal={
            toggleGoal
          }
        />
      );
    }

    // ==================================================
    // REVISION
    // ==================================================

    if (page === "revision") {
      return (
        <RevisionPage
          plans={
            visibleRevisionPlans
          }
          setShowRevisionModal={
            setShowRevisionModal
          }
          completeRevision={
            completeRevision
          }
        />
      );
    }

    // ==================================================
    // AI
    // ==================================================

    if (page === "ai") {
      return (
        <AIAssistantPage
          question={
            aiQuestion
          }
          setQuestion={
            setAiQuestion
          }
          answer={
            aiAnswer
          }
          askAI={
            askAI
          }
        />
      );
    }

    // ==================================================
    // CHAT
    // ==================================================

    if (page === "chat") {
      return (
        <ChatPage
          profile={profile}
          users={users}
          partners={
            chatPartners
          }
          partner={
            chatPartner
          }
          setPartner={
            setChatPartner
          }
          messages={
            visibleMessages
          }
          text={
            chatText
          }
          setText={
            setChatText
          }
          sendMessage={
            sendMessage
          }
        />
      );
    }

    // ==================================================
    // PERFORMANCE
    // ==================================================

    if (
      page === "performance"
    ) {
      return (
        <PerformancePage
          attempts={
            visibleAttempts
          }
          averageScore={
            averageScore
          }
          completionRate={
            completionRate
          }
        />
      );
    }

    // ==================================================
    // SETTINGS
    // ==================================================

    if (page === "settings") {
      return (
        <SettingsPage
          profile={profile}
          name={settingsName}
          setName={
            setSettingsName
          }
          save={
            saveSettings
          }
        />
      );
    }

    return null;
  };

  // ====================================================
  // MAIN APP
  // ====================================================

  return (
    <div className="app-shell">

      {/* SIDEBAR */}

      <aside className="sidebar">

        <div className="sidebar-brand">

          <div className="brand-mark">
            L
          </div>

          <div>
            <strong>
              Learnio
            </strong>

            <span>
              Study workspace
            </span>
          </div>

        </div>

        <div className="profile-mini">

          <div className="avatar">
            {(profile?.name ||
              "U")
              .charAt(0)
              .toUpperCase()}
          </div>

          <div>
            <strong>
              {profile?.name ||
                "User"}
            </strong>

            <span>
              {profile?.role ===
              "teacher"
                ? "Teacher"
                : "Student"}
            </span>
          </div>

        </div>

        <nav className="main-nav">

          <span className="nav-section-title">
            WORKSPACE
          </span>

          {nav.map(
            (item) => (
              <button
                key={item[0]}
                className={`nav-btn ${
                  page === item[0]
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setPage(
                    item[0]
                  )
                }
              >
                <span className="nav-icon">
                  {item[1]}
                </span>

                <span>
                  {item[2]}
                </span>
              </button>
            )
          )}

          <span className="nav-section-title second">
            ACCOUNT
          </span>

          <button
            className={`nav-btn ${
              page ===
              "settings"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setPage(
                "settings"
              )
            }
          >
            <span className="nav-icon">
              ⚙️
            </span>

            <span>
              Settings
            </span>
          </button>

        </nav>

        {profile?.role ===
          "teacher" &&
          teacherClass && (
            <div className="class-code-side">

              <span>
                YOUR CLASS CODE
              </span>

              <strong>
                {
                  teacherClass.code
                }
              </strong>

              <button
                onClick={() => {
                  navigator.clipboard
                    ?.writeText(
                      teacherClass.code
                    );

                  alert(
                    "Class code copied."
                  );
                }}
              >
                Copy code
              </button>

            </div>
          )}

        <button
          className="logout-btn"
          onClick={
            handleLogout
          }
        >
          ↪ Sign out
        </button>

      </aside>

      {/* MAIN */}

      <main className="main-area">

        <header className="topbar">

          <div>

            <span className="page-kicker">
              {profile?.role ===
              "teacher"
                ? "TEACHER WORKSPACE"
                : "STUDENT WORKSPACE"}
            </span>

            <h1>
              {page ===
              "dashboard"
                ? `Good day, ${
                    profile?.name?.split(
                      " "
                    )[0] ||
                    "there"
                  }`
                : currentPageTitle}
            </h1>

          </div>

          <div className="topbar-actions">

            <div className="date-chip">
              {new Date().toLocaleDateString(
                "en-IN",
                {
                  weekday:
                    "short",
                  day:
                    "numeric",
                  month:
                    "short",
                }
              )}
            </div>

            <div className="top-avatar">
              {(profile?.name ||
                "U")
                .charAt(0)
                .toUpperCase()}
            </div>

          </div>

        </header>

        <div className="content-area">
          {renderPage()}
        </div>

      </main>

      {/* ==================================================
          MATERIAL MODAL
      ================================================== */}

      {showMaterialModal && (
        <Modal
          title="Add material"
          close={() =>
            setShowMaterialModal(
              false
            )
          }
        >

          <form
            className="modal-form"
            onSubmit={
              saveMaterial
            }
          >

            <label>
              Title

              <input
                value={
                  materialForm.title
                }
                onChange={(e) =>
                  setMaterialForm(
                    {
                      ...materialForm,
                      title:
                        e.target
                          .value,
                    }
                  )
                }
                placeholder="Example: Unit 1 Notes"
              />

            </label>

            <label>
              Subject

              <input
                value={
                  materialForm.subject
                }
                onChange={(e) =>
                  setMaterialForm(
                    {
                      ...materialForm,
                      subject:
                        e.target
                          .value,
                    }
                  )
                }
                placeholder="Example: Java"
              />

            </label>

            <label>
              Description

              <textarea
                value={
                  materialForm.description
                }
                onChange={(e) =>
                  setMaterialForm(
                    {
                      ...materialForm,
                      description:
                        e.target
                          .value,
                    }
                  )
                }
              />

            </label>

            <label>
              Resource link

              <input
                value={
                  materialForm.link
                }
                onChange={(e) =>
                  setMaterialForm(
                    {
                      ...materialForm,
                      link:
                        e.target
                          .value,
                    }
                  )
                }
                placeholder="https://..."
              />

            </label>

            <div className="modal-actions">

              <button
                type="button"
                className="secondary-btn"
                onClick={() =>
                  setShowMaterialModal(
                    false
                  )
                }
              >
                Cancel
              </button>

              <button className="primary-btn">
                Save material
              </button>

            </div>

          </form>

        </Modal>
      )}

      {/* ==================================================
          NOTE MODAL
      ================================================== */}

      {showNoteModal && (
        <Modal
          title="Create my note"
          close={() =>
            setShowNoteModal(
              false
            )
          }
        >

          <form
            className="modal-form"
            onSubmit={
              saveStudentNote
            }
          >

            <label>
              Note title

              <input
                value={
                  noteForm.title
                }
                onChange={(e) =>
                  setNoteForm(
                    {
                      ...noteForm,
                      title:
                        e.target
                          .value,
                    }
                  )
                }
              />

            </label>

            <label>
              Subject

              <input
                value={
                  noteForm.subject
                }
                onChange={(e) =>
                  setNoteForm(
                    {
                      ...noteForm,
                      subject:
                        e.target
                          .value,
                    }
                  )
                }
              />

            </label>

            <label>
              Note

              <textarea
                rows="8"
                value={
                  noteForm.content
                }
                onChange={(e) =>
                  setNoteForm(
                    {
                      ...noteForm,
                      content:
                        e.target
                          .value,
                    }
                  )
                }
              />

            </label>

            <div className="modal-actions">

              <button
                type="button"
                className="secondary-btn"
                onClick={() =>
                  setShowNoteModal(
                    false
                  )
                }
              >
                Cancel
              </button>

              <button className="primary-btn">
                Save note
              </button>

            </div>

          </form>

        </Modal>
      )}

      {/* ==================================================
          QUIZ MODAL
      ================================================== */}

      {showQuizModal && (
        <Modal
          title="Create quiz"
          close={() =>
            setShowQuizModal(
              false
            )
          }
          large
        >

          <form
            className="modal-form"
            onSubmit={
              saveQuiz
            }
          >

            <div className="form-grid-2">

              <label>
                Quiz title

                <input
                  value={
                    quizForm.title
                  }
                  onChange={(e) =>
                    setQuizForm(
                      {
                        ...quizForm,
                        title:
                          e.target
                            .value,
                      }
                    )
                  }
                />

              </label>

              <label>
                Subject

                <input
                  value={
                    quizForm.subject
                  }
                  onChange={(e) =>
                    setQuizForm(
                      {
                        ...quizForm,
                        subject:
                          e.target
                            .value,
                      }
                    )
                  }
                />

              </label>

            </div>

            <label>
              Description

              <textarea
                value={
                  quizForm.description
                }
                onChange={(e) =>
                  setQuizForm(
                    {
                      ...quizForm,
                      description:
                        e.target
                          .value,
                    }
                  )
                }
              />

            </label>

            <div className="question-heading">

              <div>
                <span className="soft-label">
                  QUESTIONS
                </span>

                <h3>
                  {
                    quizForm
                      .questions
                      .length
                  }{" "}
                  Question
                </h3>
              </div>

              <button
                type="button"
                className="secondary-btn"
                onClick={
                  addQuizQuestion
                }
              >
                + Add question
              </button>

            </div>

            {quizForm.questions.map(
              (
                question,
                questionIndex
              ) => (
                <div
                  className="question-editor"
                  key={
                    questionIndex
                  }
                >

                  <div className="question-editor-head">

                    <strong>
                      Question{" "}
                      {questionIndex +
                        1}
                    </strong>

                    {quizForm.questions
                      .length >
                      1 && (
                      <button
                        type="button"
                        className="danger-text"
                        onClick={() =>
                          removeQuizQuestion(
                            questionIndex
                          )
                        }
                      >
                        Remove
                      </button>
                    )}

                  </div>

                  <textarea
                    placeholder="Type the question..."
                    value={
                      question.question
                    }
                    onChange={(e) =>
                      updateQuestion(
                        questionIndex,
                        "question",
                        e.target
                          .value
                      )
                    }
                  />

                  <div className="options-grid">

                    {question.options.map(
                      (
                        option,
                        optionIndex
                      ) => (
                        <div
                          className={`option-editor ${
                            question.answer ===
                            optionIndex
                              ? "correct"
                              : ""
                          }`}
                          key={
                            optionIndex
                          }
                        >

                          <input
                            value={
                              option
                            }
                            placeholder={`Option ${
                              optionIndex +
                              1
                            }`}
                            onChange={(
                              e
                            ) =>
                              updateOption(
                                questionIndex,
                                optionIndex,
                                e
                                  .target
                                  .value
                              )
                            }
                          />

                          <button
                            type="button"
                            onClick={() =>
                              updateQuestion(
                                questionIndex,
                                "answer",
                                optionIndex
                              )
                            }
                          >
                            {question.answer ===
                            optionIndex
                              ? "✓ Correct"
                              : "Set correct"}
                          </button>

                        </div>
                      )
                    )}

                  </div>

                </div>
              )
            )}

            <div className="modal-actions">

              <button
                type="button"
                className="secondary-btn"
                onClick={() =>
                  setShowQuizModal(
                    false
                  )
                }
              >
                Cancel
              </button>

              <button className="primary-btn">
                Publish quiz
              </button>

            </div>

          </form>

        </Modal>
      )}

      {/* ==================================================
          ASSIGNMENT MODAL
      ================================================== */}

      {showAssignmentModal && (
        <Modal
          title="Create assignment"
          close={() =>
            setShowAssignmentModal(
              false
            )
          }
        >

          <form
            className="modal-form"
            onSubmit={
              saveAssignment
            }
          >

            <label>
              Title

              <input
                value={
                  assignmentForm.title
                }
                onChange={(e) =>
                  setAssignmentForm(
                    {
                      ...assignmentForm,
                      title:
                        e.target
                          .value,
                    }
                  )
                }
              />

            </label>

            <div className="form-grid-2">

              <label>
                Subject

                <input
                  value={
                    assignmentForm.subject
                  }
                  onChange={(e) =>
                    setAssignmentForm(
                      {
                        ...assignmentForm,
                        subject:
                          e.target
                            .value,
                      }
                    )
                  }
                />

              </label>

              <label>
                Points

                <input
                  type="number"
                  min="1"
                  value={
                    assignmentForm.points
                  }
                  onChange={(e) =>
                    setAssignmentForm(
                      {
                        ...assignmentForm,
                        points:
                          e.target
                            .value,
                      }
                    )
                  }
                />

              </label>

            </div>

            <label>
              Due date

              <input
                type="date"
                value={
                  assignmentForm.dueDate
                }
                onChange={(e) =>
                  setAssignmentForm(
                    {
                      ...assignmentForm,
                      dueDate:
                        e.target
                          .value,
                    }
                  )
                }
              />

            </label>

            <label>
              Description

              <textarea
                rows="7"
                value={
                  assignmentForm.description
                }
                onChange={(e) =>
                  setAssignmentForm(
                    {
                      ...assignmentForm,
                      description:
                        e.target
                          .value,
                    }
                  )
                }
              />

            </label>

            <div className="modal-actions">

              <button
                type="button"
                className="secondary-btn"
                onClick={() =>
                  setShowAssignmentModal(
                    false
                  )
                }
              >
                Cancel
              </button>

              <button className="primary-btn">
                Publish assignment
              </button>

            </div>

          </form>

        </Modal>
      )}

      {/* ==================================================
          GOAL MODAL
      ================================================== */}

      {showGoalModal && (
        <Modal
          title="Add study goal"
          close={() =>
            setShowGoalModal(
              false
            )
          }
        >

          <form
            className="modal-form"
            onSubmit={
              saveGoal
            }
          >

            <label>
              Goal

              <input
                value={
                  goalForm.title
                }
                onChange={(e) =>
                  setGoalForm(
                    {
                      ...goalForm,
                      title:
                        e.target
                          .value,
                    }
                  )
                }
              />

            </label>

            <div className="form-grid-2">

              <label>
                Subject

                <input
                  value={
                    goalForm.subject
                  }
                  onChange={(e) =>
                    setGoalForm(
                      {
                        ...goalForm,
                        subject:
                          e.target
                            .value,
                      }
                    )
                  }
                />

              </label>

              <label>
                Priority

                <select
                  value={
                    goalForm.priority
                  }
                  onChange={(e) =>
                    setGoalForm(
                      {
                        ...goalForm,
                        priority:
                          e.target
                            .value,
                      }
                    )
                  }
                >
                  <option>
                    Low
                  </option>

                  <option>
                    Medium
                  </option>

                  <option>
                    High
                  </option>
                </select>

              </label>

            </div>

            <label>
              Target date

              <input
                type="date"
                value={
                  goalForm.dueDate
                }
                onChange={(e) =>
                  setGoalForm(
                    {
                      ...goalForm,
                      dueDate:
                        e.target
                          .value,
                    }
                  )
                }
              />

            </label>

            <div className="modal-actions">

              <button
                type="button"
                className="secondary-btn"
                onClick={() =>
                  setShowGoalModal(
                    false
                  )
                }
              >
                Cancel
              </button>

              <button className="primary-btn">
                Add goal
              </button>

            </div>

          </form>

        </Modal>
      )}

      {/* ==================================================
          REVISION MODAL
      ================================================== */}

      {showRevisionModal && (
        <Modal
          title="Create revision plan"
          close={() =>
            setShowRevisionModal(
              false
            )
          }
        >

          <form
            className="modal-form"
            onSubmit={
              saveRevision
            }
          >

            <label>
              Subject

              <input
                value={
                  revisionForm.subject
                }
                onChange={(e) =>
                  setRevisionForm(
                    {
                      ...revisionForm,
                      subject:
                        e.target
                          .value,
                    }
                  )
                }
              />

            </label>

            <label>
              Topics

              <textarea
                rows="5"
                value={
                  revisionForm.topics
                }
                onChange={(e) =>
                  setRevisionForm(
                    {
                      ...revisionForm,
                      topics:
                        e.target
                          .value,
                    }
                  )
                }
              />

            </label>

            <label>
              Study date

              <input
                type="date"
                value={
                  revisionForm.studyDate
                }
                onChange={(e) =>
                  setRevisionForm(
                    {
                      ...revisionForm,
                      studyDate:
                        e.target
                          .value,
                    }
                  )
                }
              />

            </label>

            <label>
              Notes

              <textarea
                value={
                  revisionForm.notes
                }
                onChange={(e) =>
                  setRevisionForm(
                    {
                      ...revisionForm,
                      notes:
                        e.target
                          .value,
                    }
                  )
                }
              />

            </label>

            <div className="modal-actions">

              <button
                type="button"
                className="secondary-btn"
                onClick={() =>
                  setShowRevisionModal(
                    false
                  )
                }
              >
                Cancel
              </button>

              <button className="primary-btn">
                Save plan
              </button>

            </div>

          </form>

        </Modal>
      )}

      {/* ==================================================
          CONNECT TEACHER
      ================================================== */}

      {showConnectModal && (
        <Modal
          title="Connect to teacher"
          close={() =>
            setShowConnectModal(
              false
            )
          }
        >

          <form
            className="modal-form"
            onSubmit={
              connectTeacher
            }
          >

            <div className="connect-explainer">

              <div className="connect-icon">
                🔗
              </div>

              <div>

                <h3>
                  Enter class code
                </h3>

                <p>
                  Ask your teacher for
                  the Learnio class code.
                </p>

              </div>

            </div>

            <label>
              Class code

              <input
                value={
                  connectCode
                }
                onChange={(e) =>
                  setConnectCode(
                    e.target.value.toUpperCase()
                  )
                }
                placeholder="LN-XXXXXX"
              />

            </label>

            <div className="modal-actions">

              <button
                type="button"
                className="secondary-btn"
                onClick={() =>
                  setShowConnectModal(
                    false
                  )
                }
              >
                Cancel
              </button>

              <button className="primary-btn">
                Connect
              </button>

            </div>

          </form>

        </Modal>
      )}

      {/* ==================================================
          TAKE QUIZ
      ================================================== */}

      {selectedQuiz && (
        <Modal
          title={
            selectedQuiz.title
          }
          close={() => {
            setSelectedQuiz(null);
            setQuizAnswers([]);
          }}
          large
        >

          <div className="take-quiz">

            <p className="modal-description">
              {selectedQuiz.description ||
                "Choose one answer for each question."}
            </p>

            {(
              selectedQuiz.questions ||
              []
            ).map(
              (
                question,
                questionIndex
              ) => (
                <div
                  className="take-question"
                  key={
                    questionIndex
                  }
                >

                  <div className="question-number">
                    Question{" "}
                    {questionIndex +
                      1}
                  </div>

                  <h3>
                    {
                      question.question
                    }
                  </h3>

                  <div className="answer-list">

                    {question.options.map(
                      (
                        option,
                        optionIndex
                      ) => (
                        <button
                          className={`answer-option ${
                            quizAnswers[
                              questionIndex
                            ] ===
                            optionIndex
                              ? "selected"
                              : ""
                          }`}
                          key={
                            optionIndex
                          }
                          onClick={() =>
                            setQuizAnswers(
                              (
                                previous
                              ) => {
                                const next =
                                  [
                                    ...previous,
                                  ];

                                next[
                                  questionIndex
                                ] =
                                  optionIndex;

                                return next;
                              }
                            )
                          }
                        >

                          <span>
                            {String.fromCharCode(
                              65 +
                                optionIndex
                            )}
                          </span>

                          {
                            option
                          }

                        </button>
                      )
                    )}

                  </div>

                </div>
              )
            )}

            <div className="quiz-submit-row">

              <button
                className="primary-btn"
                onClick={
                  submitQuiz
                }
              >
                Submit quiz
              </button>

            </div>

          </div>

        </Modal>
      )}

      {/* ==================================================
          ASSIGNMENT VIEW
      ================================================== */}

      {selectedAssignment && (
        <Modal
          title={
            selectedAssignment.title
          }
          close={() =>
            setSelectedAssignment(
              null
            )
          }
        >

          <div className="assignment-detail">

            <div className="assignment-meta-row">

              <span>
                📚{" "}
                {
                  selectedAssignment.subject ||
                  "General"
                }
              </span>

              <span>
                📅 Due{" "}
                {formatDate(
                  selectedAssignment.dueDate
                )}
              </span>

              <span>
                ⭐{" "}
                {
                  selectedAssignment.points
                }{" "}
                points
              </span>

            </div>

            <div className="assignment-description">
              {
                selectedAssignment.description ||
                "No description."
              }
            </div>

            <label>
              Your answer

              <textarea
                rows="10"
                value={
                  assignmentAnswer
                }
                onChange={(e) =>
                  setAssignmentAnswer(
                    e.target.value
                  )
                }
                placeholder="Write your answer..."
              />

            </label>

            <div className="modal-actions">

              <button
                className="secondary-btn"
                onClick={() =>
                  setSelectedAssignment(
                    null
                  )
                }
              >
                Close
              </button>

              <button
                className="primary-btn"
                onClick={
                  submitAssignment
                }
              >
                Submit assignment
              </button>

            </div>

          </div>

        </Modal>
      )}

    </div>
  );
}

// ======================================================
// MODAL
// ======================================================

function Modal({
  title,
  close,
  children,
  large = false,
}) {
  return (
    <div className="modal-overlay">

      <div
        className={`modal-card ${
          large
            ? "modal-large"
            : ""
        }`}
      >

        <div className="modal-header">

          <div>

            <span className="soft-label">
              LEARNIO
            </span>

            <h2>
              {title}
            </h2>

          </div>

          <button
            className="modal-close"
            onClick={
              close
            }
          >
            ×
          </button>

        </div>

        {children}

      </div>

    </div>
  );
}

// ======================================================
// TEACHER DASHBOARD
// ======================================================

function TeacherDashboard({
  profile,
  teacherClass,
  students,
  materials,
  quizzes,
  assignments,
  setPage,
}) {
  return (
    <div className="page-stack">

      <section className="hero-banner teacher">

        <div>

          <span className="hero-label">
            TEACHER SPACE
          </span>

          <h2>
            Manage your classroom
            easily.
          </h2>

          <p>
            Share materials, create
            quizzes and assignments,
            and keep track of your
            students.
          </p>

          <button
            className="light-btn"
            onClick={() =>
              setPage(
                "class"
              )
            }
          >
            View my class →
          </button>

        </div>

        <div className="hero-visual">

          <div className="floating-card one">
            <span>
              Students
            </span>

            <strong>
              {
                students.length
              }
            </strong>
          </div>

          <div className="floating-card two">
            <span>
              Materials
            </span>

            <strong>
              {
                materials.length
              }
            </strong>
          </div>

          <div className="floating-card three">
            <span>
              Quizzes
            </span>

            <strong>
              {
                quizzes.length
              }
            </strong>
          </div>

        </div>

      </section>

      <div className="stat-grid four">

        <StatCard
          icon="👥"
          label="Students"
          value={
            students.length
          }
          tone="purple"
        />

        <StatCard
          icon="📚"
          label="Materials"
          value={
            materials.length
          }
          tone="blue"
        />

        <StatCard
          icon="📝"
          label="Quizzes"
          value={
            quizzes.length
          }
          tone="green"
        />

        <StatCard
          icon="📌"
          label="Assignments"
          value={
            assignments.length
          }
          tone="orange"
        />

      </div>

      <div className="dashboard-grid">

        <section className="panel">

          <PanelHeader
            title="Your class"
            subtitle="Class code for students"
            actionText="Open"
            onAction={() =>
              setPage(
                "class"
              )
            }
          />

          {teacherClass ? (
            <div className="class-preview">

              <div>

                <span>
                  CLASS CODE
                </span>

                <strong>
                  {
                    teacherClass.code
                  }
                </strong>

              </div>

              <div>

                <span>
                  STUDENTS
                </span>

                <strong>
                  {
                    students.length
                  }
                </strong>

              </div>

            </div>
          ) : (
            <EmptyState
              icon="🏫"
              title="Creating class..."
              text="Your class code will appear soon."
            />
          )}

        </section>

        <section className="panel">

          <PanelHeader
            title="Quick activity"
            subtitle="Your learning workspace"
          />

          <div className="activity-list">

            <ActivityItem
              icon="📚"
              title={`${materials.length} materials`}
              text="Resources"
            />

            <ActivityItem
              icon="📝"
              title={`${quizzes.length} quizzes`}
              text="Assessments"
            />

            <ActivityItem
              icon="📌"
              title={`${assignments.length} assignments`}
              text="Student tasks"
            />

          </div>

        </section>

      </div>

      <QuickActions
        role="teacher"
        setPage={
          setPage
        }
      />

    </div>
  );
}

// ======================================================
// STUDENT DASHBOARD
// ======================================================

function StudentDashboard({
  teachers,
  materials,
  quizzes,
  assignments,
  goals,
  completionRate,
  averageScore,
  setPage,
  setShowGoalModal,
}) {
  return (
    <div className="page-stack">

      <section className="hero-banner student">

        <div>

          <span className="hero-label">
            STUDENT SPACE
          </span>

          <h2>
            Make every study
            session count.
          </h2>

          <p>
            Keep your study materials,
            assignments, quizzes and
            revision in one place.
          </p>

          <button
            className="light-btn"
            onClick={() =>
              setShowGoalModal(
                true
              )
            }
          >
            + Add study goal
          </button>

        </div>

        <div className="hero-student-mark">
          L
        </div>

      </section>

      <div className="stat-grid four">

        <StatCard
          icon="👨‍🏫"
          label="Teachers"
          value={
            teachers.length
          }
          tone="purple"
        />

        <StatCard
          icon="📚"
          label="Materials"
          value={
            materials.length
          }
          tone="blue"
        />

        <StatCard
          icon="🎯"
          label="Goal progress"
          value={`${completionRate}%`}
          tone="green"
        />

        <StatCard
          icon="⭐"
          label="Average score"
          value={`${averageScore}%`}
          tone="orange"
        />

      </div>

      <div className="dashboard-grid">

        <section className="panel">

          <PanelHeader
            title="Study progress"
            subtitle="Your current goal progress"
            actionText="Goals"
            onAction={() =>
              setPage(
                "goals"
              )
            }
          />

          <div className="progress-block">

            <div className="progress-top">

              <span>
                Goal completion
              </span>

              <strong>
                {
                  completionRate
                }%
              </strong>

            </div>

            <div className="progress-track">

              <div
                className="progress-value"
                style={{
                  width: `${completionRate}%`,
                }}
              />

            </div>

          </div>

          <div className="mini-stats">

            <div>
              <strong>
                {
                  quizzes.length
                }
              </strong>
              <span>
                Quizzes
              </span>
            </div>

            <div>
              <strong>
                {
                  assignments.length
                }
              </strong>
              <span>
                Assignments
              </span>
            </div>

            <div>
              <strong>
                {
                  goals.length
                }
              </strong>
              <span>
                Goals
              </span>
            </div>

          </div>

        </section>

        <section className="panel">

          <PanelHeader
            title="Your goals"
            subtitle="Recent study targets"
          />

          {goals.length ? (
            <div className="focus-list">

              {goals
                .slice(0, 5)
                .map(
                  (
                    goal
                  ) => (
                    <div
                      className="focus-item"
                      key={
                        goal.id
                      }
                    >

                      <div
                        className={`focus-dot ${
                          goal.completed
                            ? "done"
                            : ""
                        }`}
                      />

                      <div>

                        <strong>
                          {
                            goal.title
                          }
                        </strong>

                        <span>
                          {
                            goal.subject ||
                            "General"
                          }{" "}
                          •{" "}
                          {goal.completed
                            ? "Completed"
                            : "Pending"}
                        </span>

                      </div>

                    </div>
                  )
                )}

            </div>
          ) : (
            <EmptyState
              icon="🎯"
              title="No goals yet"
              text="Create your first study goal."
            />
          )}

        </section>

      </div>

      <QuickActions
        role="student"
        setPage={
          setPage
        }
      />

    </div>
  );
}

// ======================================================
// CLASS PAGE
// ======================================================

function TeacherClassPage({
  teacherClass,
  students,
  setPage,
}) {
  return (
    <div className="page-stack">

      <PageIntro
        eyebrow="CLASSROOM"
        title="My Class"
        text="Share this code with your students."
      />

      <div className="class-hero-card">

        <div>

          <span className="soft-label">
            YOUR CLASS CODE
          </span>

          <h2>
            {
              teacherClass?.code ||
              "Creating..."
            }
          </h2>

          <p>
            Students can use this
            code from their
            <strong>
              {" "}
              My Teachers
            </strong>{" "}
            page.
          </p>

        </div>

        <div className="class-code-big">

          {
            teacherClass?.code ||
            "..."
          }

        </div>

      </div>

      <section className="panel">

        <PanelHeader
          title="Connected students"
          subtitle={`${students.length} student${
            students.length ===
            1
              ? ""
              : "s"
          } connected`}
          actionText="Reports"
          onAction={() =>
            setPage(
              "reports"
            )
          }
        />

        {students.length ? (
          <div className="people-grid">

            {students.map(
              (student) => (
                <PersonCard
                  key={
                    student.uid ||
                    student.id
                  }
                  person={
                    student
                  }
                  role="Student"
                />
              )
            )}

          </div>
        ) : (
          <EmptyState
            icon="👥"
            title="No students connected"
            text="Give your class code to students."
          />
        )}

      </section>

    </div>
  );
}

// ======================================================
// TEACHERS
// ======================================================

function TeachersPage({
  teachers,
  setShowConnectModal,
}) {
  return (
    <div className="page-stack">

      <PageIntro
        eyebrow="YOUR TEACHERS"
        title="My Teachers"
        text="Connect to your teacher with the class code."
        action={
          <button
            className="primary-btn"
            onClick={() =>
              setShowConnectModal(
                true
              )
            }
          >
            + Connect teacher
          </button>
        }
      />

      {teachers.length ? (
        <div className="people-grid">

          {teachers.map(
            (teacher) => (
              <PersonCard
                key={
                  teacher.uid ||
                  teacher.id
                }
                person={
                  teacher
                }
                role="Teacher"
              />
            )
          )}

        </div>
      ) : (
        <section className="panel">

          <EmptyState
            icon="👨‍🏫"
            title="No teachers connected"
            text="Enter your teacher's class code."
            action={
              <button
                className="primary-btn"
                onClick={() =>
                  setShowConnectModal(
                    true
                  )
                }
              >
                Connect teacher
              </button>
            }
          />

        </section>
      )}

    </div>
  );
}

// ======================================================
// STUDENTS PAGE
// ======================================================

function TeacherStudentsPage({
  students,
  teacherClass,
}) {
  return (
    <div className="page-stack">

      <PageIntro
        eyebrow="STUDENTS"
        title="Students"
        text="Students connected to your class."
      />

      <div className="stat-grid three">

        <StatCard
          icon="👥"
          label="Students"
          value={
            students.length
          }
          tone="purple"
        />

        <StatCard
          icon="🔑"
          label="Class code"
          value={
            teacherClass?.code ||
            "-"
          }
          tone="blue"
        />

        <StatCard
          icon="✅"
          label="Status"
          value="Active"
          tone="green"
        />

      </div>

      <section className="panel">

        <PanelHeader
          title="Student list"
          subtitle="Connected learners"
        />

        {students.length ? (
          <div className="people-grid">

            {students.map(
              (student) => (
                <PersonCard
                  key={
                    student.uid ||
                    student.id
                  }
                  person={
                    student
                  }
                  role="Student"
                />
              )
            )}

          </div>
        ) : (
          <EmptyState
            icon="👤"
            title="No students yet"
            text="Students will appear here after they connect."
          />
        )}

      </section>

    </div>
  );
}

// ======================================================
// REPORTS
// ======================================================

function ReportsPage({
  students,
  attempts,
  submissions,
}) {
  const average = attempts.length
    ? Math.round(
        attempts.reduce(
          (
            sum,
            item
          ) =>
            sum +
            Number(
              item.percentage ||
                0
            ),
          0
        ) /
          attempts.length
      )
    : 0;

  return (
    <div className="page-stack">

      <PageIntro
        eyebrow="REPORTS"
        title="Reports"
        text="Overview of quiz and assignment activity."
      />

      <div className="stat-grid three">

        <StatCard
          icon="📝"
          label="Quiz attempts"
          value={
            attempts.length
          }
          tone="purple"
        />

        <StatCard
          icon="⭐"
          label="Average score"
          value={`${average}%`}
          tone="green"
        />

        <StatCard
          icon="📌"
          label="Submissions"
          value={
            submissions.length
          }
          tone="orange"
        />

      </div>

      <section className="panel">

        <PanelHeader
          title="Quiz activity"
          subtitle="Recent attempts"
        />

        {attempts.length ? (
          <div className="data-table-wrap">

            <table className="data-table">

              <thead>
                <tr>
                  <th>
                    Student
                  </th>
                  <th>
                    Quiz
                  </th>
                  <th>
                    Score
                  </th>
                  <th>
                    Date
                  </th>
                </tr>
              </thead>

              <tbody>

                {attempts
                  .slice()
                  .reverse()
                  .map(
                    (
                      attempt
                    ) => (
                      <tr
                        key={
                          attempt.id
                        }
                      >

                        <td>
                          {
                            attempt.studentName
                          }
                        </td>

                        <td>
                          {
                            attempt.quizTitle
                          }
                        </td>

                        <td>
                          {
                            attempt.score
                          }
                          /
                          {
                            attempt.total
                          }{" "}
                          (
                          {
                            attempt.percentage
                          }%)
                        </td>

                        <td>
                          {formatDateTime(
                            attempt.submittedAt
                          )}
                        </td>

                      </tr>
                    )
                  )}

              </tbody>

            </table>

          </div>
        ) : (
          <EmptyState
            icon="📊"
            title="No activity yet"
            text="Quiz attempts will appear here."
          />
        )}

      </section>

      <section className="panel">

        <PanelHeader
          title="Students"
          subtitle={`${students.length} connected`}
        />

        <div className="people-grid">

          {students.map(
            (student) => (
              <PersonCard
                key={
                  student.uid ||
                  student.id
                }
                person={
                  student
                }
                role="Student"
              />
            )
          )}

        </div>

      </section>

    </div>
  );
}

// ======================================================
// MATERIALS PAGE
// ======================================================

function MaterialsPage({
  role,
  materials,
  profile,
  setShowMaterialModal,
  setShowNoteModal,
}) {
  const teacherMaterials =
    materials.filter(
      (item) => item.teacherId
    );

  const ownNotes =
    materials.filter(
      (item) =>
        item.ownerId ===
        profile.id
    );

  return (
    <div className="page-stack">

      <PageIntro
        eyebrow="LEARNING LIBRARY"
        title="Materials"
        text={
          role ===
          "teacher"
            ? "Share resources with your students."
            : "View your teacher materials and personal notes."
        }
        action={
          role === "teacher" ? (
            <button
              className="primary-btn"
              onClick={() =>
                setShowMaterialModal(
                  true
                )
              }
            >
              + Add material
            </button>
          ) : (
            <button
              className="primary-btn"
              onClick={() =>
                setShowNoteModal(
                  true
                )
              }
            >
              + Add note
            </button>
          )
        }
      />

      <section className="panel">

        <PanelHeader
          title={
            role ===
            "teacher"
              ? "Shared materials"
              : "Teacher materials"
          }
          subtitle={`${teacherMaterials.length} resources`}
        />

        {teacherMaterials.length ? (
          <div className="resource-grid">

            {teacherMaterials.map(
              (item) => (
                <ResourceCard
                  item={item}
                  key={
                    item.id
                  }
                />
              )
            )}

          </div>
        ) : (
          <EmptyState
            icon="📚"
            title="No materials yet"
            text={
              role ===
              "teacher"
                ? "Add your first material."
                : "Your teachers have not shared materials yet."
            }
          />
        )}

      </section>

      {role ===
        "student" && (
        <section className="panel">

          <PanelHeader
            title="My notes"
            subtitle={`${ownNotes.length} personal notes`}
            actionText="Add note"
            onAction={() =>
              setShowNoteModal(
                true
              )
            }
          />

          {ownNotes.length ? (
            <div className="resource-grid">

              {ownNotes.map(
                (item) => (
                  <ResourceCard
                    item={item}
                    own
                    key={
                      item.id
                    }
                  />
                )
              )}

            </div>
          ) : (
            <EmptyState
              icon="✍️"
              title="No notes yet"
              text="Create your own quick revision notes."
            />
          )}

        </section>
      )}

    </div>
  );
}

// ======================================================
// QUIZZES PAGE
// ======================================================

function QuizzesPage({
  role,
  quizzes,
  attempts,
  setShowQuizModal,
  startQuiz,
}) {
  return (
    <div className="page-stack">

      <PageIntro
        eyebrow="PRACTICE"
        title="Quizzes"
        text={
          role ===
          "teacher"
            ? "Create quizzes for students."
            : "Take quizzes shared by teachers."
        }
        action={
          role ===
          "teacher" && (
            <button
              className="primary-btn"
              onClick={() =>
                setShowQuizModal(
                  true
                )
              }
            >
              + Create quiz
            </button>
          )
        }
      />

      {quizzes.length ? (
        <div className="resource-grid">

          {quizzes.map(
            (quiz) => {
              const attempt =
                attempts.find(
                  (item) =>
                    item.quizId ===
                    quiz.id
                );

              return (
                <div
                  className="quiz-card"
                  key={
                    quiz.id
                  }
                >

                  <div className="quiz-top">

                    <div className="quiz-icon">
                      📝
                    </div>

                    <span className="subject-pill">
                      {
                        quiz.subject ||
                        "General"
                      }
                    </span>

                  </div>

                  <h3>
                    {
                      quiz.title
                    }
                  </h3>

                  <p>
                    {
                      quiz.description ||
                      "No description."
                    }
                  </p>

                  <div className="quiz-info">

                    <span>
                      {
                        quiz.questions?.length ||
                        0
                      }{" "}
                      questions
                    </span>

                    {attempt && (
                      <span className="score-pill">
                        {
                          attempt.percentage
                        }%
                      </span>
                    )}

                  </div>

                  {role ===
                  "student" ? (
                    <button
                      className="primary-btn full"
                      onClick={() =>
                        startQuiz(
                          quiz
                        )
                      }
                    >
                      Take quiz
                    </button>
                  ) : (
                    <div className="created-label">
                      Published
                    </div>
                  )}

                </div>
              );
            }
          )}

        </div>
      ) : (
        <section className="panel">

          <EmptyState
            icon="📝"
            title="No quizzes"
            text={
              role ===
              "teacher"
                ? "Create your first quiz."
                : "No quizzes shared yet."
            }
          />

        </section>
      )}

    </div>
  );
}

// ======================================================
// ASSIGNMENTS PAGE
// ======================================================

function AssignmentsPage({
  role,
  assignments,
  submissions,
  profile,
  setShowAssignmentModal,
  openAssignment,
}) {
  return (
    <div className="page-stack">

      <PageIntro
        eyebrow="TASKS"
        title="Assignments"
        text={
          role ===
          "teacher"
            ? "Create and publish assignments."
            : "View and submit your assignments."
        }
        action={
          role ===
          "teacher" && (
            <button
              className="primary-btn"
              onClick={() =>
                setShowAssignmentModal(
                  true
                )
              }
            >
              + Create assignment
            </button>
          )
        }
      />

      {assignments.length ? (
        <div className="assignment-grid">

          {assignments.map(
            (assignment) => {

              const submission =
                submissions.find(
                  (item) =>
                    item.assignmentId ===
                      assignment.id &&
                    item.studentId ===
                      profile.id
                );

              return (
                <div
                  className="assignment-card"
                  key={
                    assignment.id
                  }
                >

                  <div className="assignment-head">

                    <div className="assignment-icon">
                      📌
                    </div>

                    <span className="subject-pill">
                      {
                        assignment.subject ||
                        "General"
                      }
                    </span>

                  </div>

                  <h3>
                    {
                      assignment.title
                    }
                  </h3>

                  <p>
                    {
                      assignment.description ||
                      "No description."
                    }
                  </p>

                  <div className="assignment-meta">

                    <span>
                      📅{" "}
                      {formatDate(
                        assignment.dueDate
                      )}
                    </span>

                    <span>
                      ⭐{" "}
                      {
                        assignment.points
                      }{" "}
                      points
                    </span>

                  </div>

                  {role ===
                  "student" ? (
                    <>
                      {submission && (
                        <div className="submission-status">
                          ✓ Submitted
                        </div>
                      )}

                      <button
                        className="primary-btn full"
                        onClick={() =>
                          openAssignment(
                            assignment
                          )
                        }
                      >
                        {submission
                          ? "View / update"
                          : "Open assignment"}
                      </button>
                    </>
                  ) : (
                    <div className="created-label">
                      Published
                    </div>
                  )}

                </div>
              );
            }
          )}

        </div>
      ) : (
        <section className="panel">

          <EmptyState
            icon="📌"
            title="No assignments"
            text={
              role ===
              "teacher"
                ? "Create your first assignment."
                : "No assignments shared yet."
            }
          />

        </section>
      )}

    </div>
  );
}

// ======================================================
// GOALS
// ======================================================

function GoalsPage({
  goals,
  setShowGoalModal,
  toggleGoal,
}) {
  return (
    <div className="page-stack">

      <PageIntro
        eyebrow="YOUR ROUTINE"
        title="Study Goals"
        text="Set small targets for your study routine."
        action={
          <button
            className="primary-btn"
            onClick={() =>
              setShowGoalModal(
                true
              )
            }
          >
            + Add goal
          </button>
        }
      />

      {goals.length ? (
        <div className="goal-grid">

          {goals.map(
            (goal) => (
              <div
                className={`goal-card ${
                  goal.completed
                    ? "completed"
                    : ""
                }`}
                key={
                  goal.id
                }
              >

                <button
                  className={`goal-check ${
                    goal.completed
                      ? "checked"
                      : ""
                  }`}
                  onClick={() =>
                    toggleGoal(
                      goal
                    )
                  }
                >
                  {goal.completed
                    ? "✓"
                    : ""}
                </button>

                <div className="goal-content">

                  <div className="goal-top">

                    <span className="priority medium">
                      {
                        goal.priority ||
                        "Medium"
                      }
                    </span>

                    <span>
                      {goal.dueDate
                        ? formatDate(
                            goal.dueDate
                          )
                        : "No date"}
                    </span>

                  </div>

                  <h3>
                    {
                      goal.title
                    }
                  </h3>

                  <p>
                    {
                      goal.subject ||
                      "General"
                    }
                  </p>

                </div>

              </div>
            )
          )}

        </div>
      ) : (
        <section className="panel">

          <EmptyState
            icon="🎯"
            title="No goals yet"
            text="Add one study goal to get started."
          />

        </section>
      )}

    </div>
  );
}

// ======================================================
// REVISION
// ======================================================

function RevisionPage({
  plans,
  setShowRevisionModal,
  completeRevision,
}) {
  return (
    <div className="page-stack">

      <PageIntro
        eyebrow="SMART REVISION"
        title="Revision Plan"
        text="Plan what you want to revise and when."
        action={
          <button
            className="primary-btn"
            onClick={() =>
              setShowRevisionModal(
                true
              )
            }
          >
            + Add plan
          </button>
        }
      />

      {plans.length ? (
        <div className="revision-grid">

          {plans.map(
            (plan) => (
              <div
                className={`revision-card ${
                  plan.status ===
                  "Completed"
                    ? "completed"
                    : ""
                }`}
                key={
                  plan.id
                }
              >

                <div className="revision-date">
                  {
                    plan.studyDate
                      ? formatDate(
                          plan.studyDate
                        )
                      : "No date"
                  }
                </div>

                <div className="revision-body">

                  <div className="revision-heading">

                    <div>

                      <span className="soft-label">
                        {
                          plan.subject ||
                          "GENERAL"
                        }
                      </span>

                      <h3>
                        {
                          plan.topics
                        }
                      </h3>

                    </div>

                    <span className="status-badge">
                      {
                        plan.status ||
                        "Planned"
                      }
                    </span>

                  </div>

                  {plan.notes && (
                    <p>
                      {
                        plan.notes
                      }
                    </p>
                  )}

                  <button
                    className="secondary-btn"
                    onClick={() =>
                      completeRevision(
                        plan
                      )
                    }
                  >
                    {plan.status ===
                    "Completed"
                      ? "Mark planned"
                      : "Mark completed"}
                  </button>

                </div>

              </div>
            )
          )}

        </div>
      ) : (
        <section className="panel">

          <EmptyState
            icon="🔄"
            title="No revision plans"
            text="Create your first revision plan."
          />

        </section>
      )}

    </div>
  );
}

// ======================================================
// AI
// ======================================================

function AIAssistantPage({
  question,
  setQuestion,
  answer,
  askAI,
}) {
  return (
    <div className="page-stack">

      <PageIntro
        eyebrow="STUDY SUPPORT"
        title="AI Doubt Assistant"
        text="Ask your study doubt in simple language."
      />

      <section className="ai-card">

        <div className="ai-header">

          <div className="ai-symbol">
            ✦
          </div>

          <div>

            <span>
              LEARNIO ASSISTANT
            </span>

            <h2>
              What are you stuck on?
            </h2>

          </div>

        </div>

        <textarea
          rows="7"
          value={
            question
          }
          onChange={(e) =>
            setQuestion(
              e.target.value
            )
          }
          placeholder="Example: What is inheritance in Java?"
        />

        <div className="ai-actions">

          <button
            className="primary-btn"
            onClick={
              askAI
            }
          >
            Ask assistant
          </button>

        </div>

        <div className="ai-answer">

          <div className="answer-label">
            ANSWER
          </div>

          <p>
            {
              answer
            }
          </p>

        </div>

      </section>

    </div>
  );
}

// ======================================================
// CHAT
// ======================================================

function ChatPage({
  profile,
  users,
  partners,
  partner,
  setPartner,
  messages,
  text,
  setText,
  sendMessage,
}) {
  const selectedPerson =
    users.find(
      (item) =>
        (item.uid ||
          item.id) ===
        partner
    );

  return (
    <div className="chat-layout">

      <aside className="chat-sidebar">

        <div className="chat-sidebar-head">

          <span className="soft-label">
            MESSAGES
          </span>

          <h3>
            {profile.role ===
            "teacher"
              ? "Students"
              : "Teachers"}
          </h3>

        </div>

        <div className="chat-partner-list">

          {partners.map(
            (person) => {

              const id =
                person.uid ||
                person.id;

              return (
                <button
                  key={id}
                  className={`chat-person ${
                    partner ===
                    id
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    setPartner(
                      id
                    )
                  }
                >

                  <div className="avatar">
                    {(person.name ||
                      "U")
                      .charAt(
                        0
                      )
                      .toUpperCase()}
                  </div>

                  <div>

                    <strong>
                      {
                        person.name
                      }
                    </strong>

                    <span>
                      {profile.role ===
                      "teacher"
                        ? "Student"
                        : "Teacher"}
                    </span>

                  </div>

                </button>
              );
            }
          )}

        </div>

      </aside>

      <section className="chat-window">

        {partner ? (
          <>

            <div className="chat-window-head">

              <div className="avatar">
                {(
                  selectedPerson?.name ||
                  "U"
                )
                  .charAt(
                    0
                  )
                  .toUpperCase()}
              </div>

              <div>

                <strong>
                  {
                    selectedPerson?.name ||
                    "User"
                  }
                </strong>

                <span>
                  Chat
                </span>

              </div>

            </div>

            <div className="message-area">

              {messages.length ? (
                messages.map(
                  (
                    message
                  ) => {

                    const own =
                      message.fromUid ===
                      profile.id;

                    return (
                      <div
                        className={`message-row ${
                          own
                            ? "own"
                            : ""
                        }`}
                        key={
                          message.id
                        }
                      >

                        <div className="message-bubble">

                          <p>
                            {
                              message.text
                            }
                          </p>

                          <span>
                            {formatDateTime(
                              message.createdAt
                            )}
                          </span>

                        </div>

                      </div>
                    );
                  }
                )
              ) : (
                <div className="chat-welcome">

                  <div className="chat-welcome-icon">
                    💬
                  </div>

                  <h3>
                    Start chatting
                  </h3>

                  <p>
                    Send a message to
                    begin.
                  </p>

                </div>
              )}

            </div>

            <form
              className="chat-compose"
              onSubmit={
                sendMessage
              }
            >

              <input
                value={
                  text
                }
                onChange={(e) =>
                  setText(
                    e.target.value
                  )
                }
                placeholder="Type your message..."
              />

              <button className="primary-btn">
                Send
              </button>

            </form>

          </>
        ) : (
          <div className="chat-welcome full">

            <div className="chat-welcome-icon">
              💬
            </div>

            <h3>
              Select someone
            </h3>

            <p>
              Choose a teacher or
              student to chat with.
            </p>

          </div>
        )}

      </section>

    </div>
  );
}

// ======================================================
// PERFORMANCE
// ======================================================

function PerformancePage({
  attempts,
  averageScore,
  completionRate,
}) {
  return (
    <div className="page-stack">

      <PageIntro
        eyebrow="YOUR PROGRESS"
        title="Performance"
        text="Track your quiz and goal progress."
      />

      <div className="stat-grid three">

        <StatCard
          icon="⭐"
          label="Average score"
          value={`${averageScore}%`}
          tone="purple"
        />

        <StatCard
          icon="🎯"
          label="Goal completion"
          value={`${completionRate}%`}
          tone="green"
        />

        <StatCard
          icon="📝"
          label="Attempts"
          value={
            attempts.length
          }
          tone="orange"
        />

      </div>

      <section className="panel">

        <PanelHeader
          title="Quiz history"
          subtitle="Your recent scores"
        />

        {attempts.length ? (
          <div className="performance-list">

            {attempts.map(
              (attempt) => (
                <div
                  className="performance-row"
                  key={
                    attempt.id
                  }
                >

                  <div>

                    <strong>
                      {
                        attempt.quizTitle
                      }
                    </strong>

                    <span>
                      {
                        attempt.score
                      }
                      /
                      {
                        attempt.total
                      }{" "}
                      correct
                    </span>

                  </div>

                  <strong>
                    {
                      attempt.percentage
                    }%
                  </strong>

                </div>
              )
            )}

          </div>
        ) : (
          <EmptyState
            icon="📈"
            title="No scores yet"
            text="Take a quiz to see your performance."
          />
        )}

      </section>

    </div>
  );
}

// ======================================================
// SETTINGS
// ======================================================

function SettingsPage({
  profile,
  name,
  setName,
  save,
}) {
  return (
    <div className="page-stack">

      <PageIntro
        eyebrow="ACCOUNT"
        title="Settings"
        text="Update your Learnio profile."
      />

      <section className="panel settings-panel">

        <div className="settings-profile">

          <div className="large-avatar">
            {(profile.name ||
              "U")
              .charAt(0)
              .toUpperCase()}
          </div>

          <div>

            <h3>
              {
                profile.name
              }
            </h3>

            <p>
              {
                profile.email
              }
            </p>

            <span className="role-chip">
              {
                profile.role
              }
            </span>

          </div>

        </div>

        <form
          className="settings-form"
          onSubmit={save}
        >

          <label>
            Name

            <input
              value={name}
              onChange={(e) =>
                setName(
                  e.target.value
                )
              }
            />

          </label>

          <label>
            Email

            <input
              value={
                profile.email ||
                ""
              }
              disabled
            />

          </label>

          <button className="primary-btn">
            Save changes
          </button>

        </form>

      </section>

    </div>
  );
}

// ======================================================
// QUICK ACTIONS
// ======================================================

function QuickActions({
  role,
  setPage,
}) {
  const actions =
    role === "teacher"
      ? [
          [
            "📚",
            "Materials",
            "Share resources",
            "materials",
          ],
          [
            "📝",
            "Quiz",
            "Create quiz",
            "quizzes",
          ],
          [
            "📌",
            "Assignment",
            "Create task",
            "assignments",
          ],
        ]
      : [
          [
            "📚",
            "Materials",
            "Open resources",
            "materials",
          ],
          [
            "🎯",
            "Goals",
            "Add study goal",
            "goals",
          ],
          [
            "🔄",
            "Revision",
            "Plan revision",
            "revision",
          ],
        ];

  return (
    <section>

      <div className="section-title-row">

        <span className="soft-label">
          QUICK ACCESS
        </span>

        <h3>
          What do you want to do?
        </h3>

      </div>

      <div className="quick-grid">

        {actions.map(
          (
            item
          ) => (
            <button
              className="quick-card"
              key={
                item[1]
              }
              onClick={() =>
                setPage(
                  item[3]
                )
              }
            >

              <div className="quick-icon">
                {
                  item[0]
                }
              </div>

              <div>

                <strong>
                  {
                    item[1]
                  }
                </strong>

                <span>
                  {
                    item[2]
                  }
                </span>

              </div>

              <span className="quick-arrow">
                →
              </span>

            </button>
          )
        )}

      </div>

    </section>
  );
}

// ======================================================
// SMALL COMPONENTS
// ======================================================

function PageIntro({
  eyebrow,
  title,
  text,
  action,
}) {
  return (
    <div className="page-intro">

      <div>

        <span className="soft-label">
          {eyebrow}
        </span>

        <h2>
          {title}
        </h2>

        <p>
          {text}
        </p>

      </div>

      {action && (
        <div>
          {action}
        </div>
      )}

    </div>
  );
}

function PanelHeader({
  title,
  subtitle,
  actionText,
  onAction,
}) {
  return (
    <div className="panel-header">

      <div>

        <h3>
          {title}
        </h3>

        {subtitle && (
          <p>
            {subtitle}
          </p>
        )}

      </div>

      {actionText && (
        <button
          className="text-btn"
          onClick={
            onAction
          }
        >
          {
            actionText
          }{" "}
          →
        </button>
      )}

    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}) {
  return (
    <div className="stat-card">

      <div
        className={`stat-icon ${tone}`}
      >
        {icon}
      </div>

      <div>

        <span>
          {label}
        </span>

        <strong>
          {value}
        </strong>

      </div>

    </div>
  );
}

function ActivityItem({
  icon,
  title,
  text,
}) {
  return (
    <div className="activity-item">

      <div className="activity-icon">
        {icon}
      </div>

      <div>

        <strong>
          {title}
        </strong>

        <span>
          {text}
        </span>

      </div>

    </div>
  );
}

function ResourceCard({
  item,
  own = false,
}) {
  return (
    <article className="resource-card">

      <div className="resource-top">

        <div className="resource-icon">
          {own
            ? "✍️"
            : "📚"}
        </div>

        <span className="subject-pill">
          {
            item.subject ||
            "General"
          }
        </span>

      </div>

      <h3>
        {item.title}
      </h3>

      <p>
        {
          item.description ||
          "No description."
        }
      </p>

      <div className="resource-bottom">

        <span>
          {
            item.type ||
            "Material"
          }
        </span>

        {item.link ? (
          <a
            className="small-link"
            href={
              item.link
            }
            target="_blank"
            rel="noreferrer"
          >
            Open →
          </a>
        ) : (
          <span className="small-link disabled">
            Saved
          </span>
        )}

      </div>

    </article>
  );
}

function PersonCard({
  person,
  role,
}) {
  return (
    <div className="person-card">

      <div className="person-avatar">
        {(person.name ||
          "U")
          .charAt(0)
          .toUpperCase()}
      </div>

      <div className="person-main">

        <h3>
          {
            person.name ||
            "User"
          }
        </h3>

        <p>
          {
            person.email ||
            "No email"
          }
        </p>

        <span>
          {role}
        </span>

      </div>

    </div>
  );
}

function EmptyState({
  icon,
  title,
  text,
  action,
}) {
  return (
    <div className="empty-state">

      <div className="empty-icon">
        {icon}
      </div>

      <h3>
        {title}
      </h3>

      <p>
        {text}
      </p>

      {action}

    </div>
  );
}