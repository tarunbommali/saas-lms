export const editCertificationFormConfig = {
  status: {
    label: "Certification Status",
    type: "select",
    options: [
      { value: "PENDING", label: "Pending" },
      { value: "ISSUED", label: "Issued" },
      { value: "REVOKED", label: "Revoked" },
      { value: "EXPIRED", label: "Expired" },
    ],
  },
  overallScore: {
    label: "Overall Score (%)",
    type: "number",
    step: 0.1,
    min: 0,
    max: 100,
  },
  completionPercentage: {
    label: "Completion Percentage (%)",
    type: "number",
    step: 0.1,
    min: 0,
    max: 100,
  },
};

export const manualCertificationFormConfig = {
  userId: {
    label: "Select User",
    type: "select",
    required: true,
  },
  courseId: {
    label: "Select Course",
    type: "select",
    required: true,
  },
  status: {
    label: "Certification Status",
    type: "select",
    options: [
      { value: "ISSUED", label: "Issued" },
      { value: "PENDING", label: "Pending" },
    ],
  },
  overallScore: {
    label: "Overall Score (%)",
    type: "number",
    step: 0.1,
    min: 0,
    max: 100,
  },
  totalTasks: {
    label: "Total Tasks",
    type: "number",
    min: 0,
  },
  completedTasks: {
    label: "Completed Tasks",
    type: "number",
    min: 0,
  },
};