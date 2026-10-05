import type { Student } from "@/lib/types";

export interface ParsedStudent {
  student_number: string;
  name: string;
  first_name: string;
  last_name: string;
  middle_name: string;
  grade_level: string;
  program: string;
  section: string;
}

export interface ParseResult {
  data: ParsedStudent[];
  errors: string[];
  totalRows: number;
}

export function parseCSV(content: string): ParseResult {
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  const errors: string[] = [];
  const data: ParsedStudent[] = [];

  if (lines.length < 2) {
    return { data: [], errors: ["CSV file is empty or has no data rows"], totalRows: 0 };
  }

  // Parse header
  const header = parseCSVLine(lines[0]);
  const headerMap = mapHeader(header);

  if (!headerMap.studentNumber) {
    errors.push("Could not find 'Student Number' column in CSV header");
    return { data: [], errors, totalRows: 0 };
  }

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    if (row.length === 0) continue;

    try {
      const student = mapRowToStudent(row, headerMap, i + 1);
      if (student) {
        data.push(student);
      }
    } catch (e) {
      errors.push(`Row ${i + 1}: ${e instanceof Error ? e.message : 'Invalid data'}`);
    }
  }

  return { data, errors, totalRows: lines.length - 1 };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
  }

  result.push(current.trim());
  return result;
}

interface HeaderMap {
  studentNumber: number | null;
  fullName: number | null;
  lastName: number | null;
  firstName: number | null;
  middleName: number | null;
  gradeLevel: number | null;
  program: number | null;
}

function mapHeader(header: string[]): HeaderMap {
  const map: HeaderMap = {
    studentNumber: null,
    fullName: null,
    lastName: null,
    firstName: null,
    middleName: null,
    gradeLevel: null,
    program: null,
  };

  header.forEach((col, index) => {
    const lower = col.toLowerCase().trim();
    if (lower.includes("student number") || lower === "student_no" || lower === "id_number") {
      map.studentNumber = index;
    } else if (lower.includes("student's name") || lower === "fullname" || lower === "full_name") {
      map.fullName = index;
    } else if (lower === "last name" || lower === "lastname" || lower === "surname") {
      map.lastName = index;
    } else if (lower === "first name" || lower === "firstname") {
      map.firstName = index;
    } else if (lower === "middle name" || lower === "middlename") {
      map.middleName = index;
    } else if (lower.includes("grade") || lower.includes("level") || lower === "year") {
      map.gradeLevel = index;
    } else if (lower === "program" || lower === "course" || lower === "strand") {
      map.program = index;
    }
  });

  return map;
}

function mapRowToStudent(row: string[], map: HeaderMap, rowNum: number): ParsedStudent | null {
  const studentNumber = map.studentNumber !== null ? row[map.studentNumber] : "";
  if (!studentNumber) {
    throw new Error("Missing student number");
  }

  const firstName = map.firstName !== null ? row[map.firstName] : "";
  const middleName = map.middleName !== null ? row[map.middleName] : "";
  const lastName = map.lastName !== null ? row[map.lastName] : "";
  const fullName = map.fullName !== null ? row[map.fullName] : "";
  const gradeLevel = map.gradeLevel !== null ? row[map.gradeLevel] : "";
  const program = map.program !== null ? row[map.program] : "";

  // Build full name if not provided
  let name = fullName;
  if (!name && lastName && firstName) {
    name = `${lastName}, ${firstName}${middleName ? ` ${middleName}` : ""}`;
  }

  if (!name) {
    throw new Error("Missing student name");
  }

  // Derive section from program and grade level
  const section = program || gradeLevel || "";

  return {
    student_number: studentNumber,
    name: name.toUpperCase(),
    first_name: firstName.toUpperCase(),
    last_name: lastName.toUpperCase(),
    middle_name: middleName.toUpperCase(),
    grade_level: gradeLevel,
    program: program,
    section: section,
  };
}

export function studentToInsert(student: ParsedStudent): Omit<Student, "id" | "created_at"> {
  return {
    student_number: student.student_number,
    name: student.name,
    first_name: student.first_name,
    last_name: student.last_name,
    middle_name: student.middle_name,
    grade_level: student.grade_level,
    program: student.program,
    section: student.section,
  };
}
