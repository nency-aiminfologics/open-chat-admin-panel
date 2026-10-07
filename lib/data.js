// Seed data. Replace the store actions in lib/store.js with real API calls later.

export const ADMIN_CREDENTIALS = { email: "admin@example.com", password: "admin123" };

const now = () => new Date().toISOString();
const ago = (d) => new Date(Date.now() - d * 86400000).toISOString();

export const seedUsers = [
  {
    id: "u1",
    name: "Aarav Patel",
    email: "aarav@example.com",
    phone: "+91 98765 43210",
    position: "Frontend Developer",
    bio: "Building delightful web apps.",
    status: "active", // active | suspended
    joinedAt: ago(40),
    interests: ["Web Development", "Photography", "Music"],
    skills: [
      {
        id: "us1",
        name: "React",
        document: { name: "react-certificate.pdf", url: "#" },
        link: "https://github.com/aarav/react-projects",
        video: { name: "react-demo.mp4", url: "#" },
        reviews: { document: false, link: false, video: false },
        status: "pending", // pending | verified | rejected
        rejectionReason: "",
      },
      {
        id: "us2",
        name: "Node.js",
        document: { name: "node-cert.pdf", url: "#" },
        link: "https://nodejs-portfolio.dev",
        video: { name: "node-api-demo.mp4", url: "#" },
        reviews: { document: true, link: true, video: true },
        status: "verified",
        rejectionReason: "",
      },
    ],
    videos: [
      { id: "v1", title: "Intro video", url: "#", uploadedAt: ago(30) },
      { id: "v2", title: "Project walkthrough", url: "#", uploadedAt: ago(12) },
    ],
    social: {
      instagram: "https://instagram.com/aarav.codes",
      facebook: "https://facebook.com/aarav.patel",
      linkedin: "https://linkedin.com/in/aarav-patel",
    },
    identity: {
      docType: "Aadhaar Card",
      docNumber: "XXXX XXXX 4321",
      files: [
        { name: "aadhaar-front.jpg", url: "#" },
        { name: "aadhaar-back.jpg", url: "#" },
      ],
      submittedAt: ago(5),
      status: "pending", // pending | verified | rejected
      rejectionReason: "",
    },
  },
  {
    id: "u2",
    name: "Diya Shah",
    email: "diya@example.com",
    phone: "+91 91234 56789",
    position: "UI/UX Designer",
    bio: "Designing with empathy.",
    status: "active",
    joinedAt: ago(70),
    interests: ["Design", "Travel", "Art"],
    skills: [
      {
        id: "us3",
        name: "Figma",
        document: { name: "figma-cert.pdf", url: "#" },
        link: "https://behance.net/diya",
        video: { name: "figma-walkthrough.mp4", url: "#" },
        reviews: { document: true, link: false, video: false },
        status: "pending",
        rejectionReason: "",
      },
    ],
    videos: [{ id: "v3", title: "Portfolio tour", url: "#", uploadedAt: ago(20) }],
    social: {
      instagram: "https://instagram.com/diya.designs",
      facebook: "",
      linkedin: "https://linkedin.com/in/diya-shah",
    },
    identity: {
      docType: "Passport",
      docNumber: "P1234567",
      files: [{ name: "passport.jpg", url: "#" }],
      submittedAt: ago(15),
      status: "verified",
      rejectionReason: "",
    },
  },
  {
    id: "u3",
    name: "Rohan Mehta",
    email: "rohan@example.com",
    phone: "+91 99887 76655",
    position: "Content Creator",
    bio: "Stories through video.",
    status: "suspended",
    joinedAt: ago(100),
    interests: ["Video Editing", "Gaming"],
    skills: [
      {
        id: "us4",
        name: "Video Editing",
        document: { name: "edit-cert.pdf", url: "#" },
        link: "https://youtube.com/@rohan",
        video: { name: "showreel.mp4", url: "#" },
        reviews: { document: true, link: true, video: true },
        status: "rejected",
        rejectionReason: "Showreel does not match the submitted certificate.",
      },
    ],
    videos: [{ id: "v4", title: "Showreel", url: "#", uploadedAt: ago(50) }],
    social: { instagram: "https://instagram.com/rohan.creates", facebook: "", linkedin: "" },
    identity: {
      docType: "Driving Licence",
      docNumber: "GJ01 2020 0001234",
      files: [{ name: "dl-front.jpg", url: "#" }],
      submittedAt: ago(25),
      status: "rejected",
      rejectionReason: "Image is blurry, please re-upload a clear copy.",
    },
  },
];

export const seedCatalogue = {
  skills: [
    { id: "s1", name: "React" },
    { id: "s2", name: "Node.js" },
    { id: "s3", name: "Figma" },
    { id: "s4", name: "Video Editing" },
    { id: "s5", name: "Photography" },
  ],
  interests: [
    { id: "i1", name: "Web Development" },
    { id: "i2", name: "Photography" },
    { id: "i3", name: "Music" },
    { id: "i4", name: "Design" },
    { id: "i5", name: "Travel" },
    { id: "i6", name: "Gaming" },
  ],
};

export const seedReports = [
  {
    id: "r1",
    reportedUserId: "u3",
    reportedBy: "Aarav Patel",
    reason: "Spam / misleading content",
    details: "User keeps posting promotional links in comments.",
    createdAt: ago(3),
    status: "open", // open | resolved
  },
  {
    id: "r2",
    reportedUserId: "u3",
    reportedBy: "Diya Shah",
    reason: "Harassment",
    details: "Sent abusive messages after I declined a collaboration.",
    createdAt: ago(2),
    status: "open",
  },
  {
    id: "r3",
    reportedUserId: "u1",
    reportedBy: "Rohan Mehta",
    reason: "Fake profile",
    details: "Believes the profile photo is not genuine.",
    createdAt: ago(1),
    status: "open",
  },
];

export const seedBlocks = [
  { id: "b1", blockerId: "u1", blockedId: "u3", createdAt: ago(4) },
  { id: "b2", blockerId: "u2", blockedId: "u3", createdAt: ago(2) },
];

export const seedTickets = [
  {
    id: "t1",
    userId: "u1",
    subject: "Unable to upload skill video",
    status: "open", // open | in_progress | resolved | closed
    createdAt: ago(2),
    messages: [
      {
        id: "m1",
        from: "user",
        text: "Every time I upload my React demo video the app shows an error.",
        at: ago(2),
      },
    ],
  },
  {
    id: "t2",
    userId: "u2",
    subject: "How long does identity verification take?",
    status: "in_progress",
    createdAt: ago(6),
    messages: [
      { id: "m2", from: "user", text: "I submitted my passport last week. Any update?", at: ago(6) },
      { id: "m3", from: "admin", text: "Hi Diya, we are reviewing it. Thanks for your patience!", at: ago(5) },
    ],
  },
];

export const seedFaqs = [
  {
    id: "f1",
    title: "How do I verify my identity?",
    description: "Go to Profile > Identity Verification and upload a government-issued ID. Review takes 1-2 business days.",
  },
  {
    id: "f2",
    title: "How are my skills verified?",
    description: "Upload a certificate, a link to your work and a short video for each skill. Our team reviews each skill separately.",
  },
];

export const seedPolicies = [
  {
    id: "p1",
    title: "Privacy Policy",
    description: "We collect only the information needed to run the service. We never sell your personal data.",
  },
  {
    id: "p2",
    title: "Terms & Conditions",
    description: "By using the app you agree to follow our community guidelines and applicable laws.",
  },
];

export const uid = (p = "id") => `${p}${Math.random().toString(36).slice(2, 9)}`;
export { now };
