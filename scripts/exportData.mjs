import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sourcePath = path.resolve(__dirname, "../src/SkillsDashboard.jsx");
const dataDir = path.resolve(__dirname, "../data");
const targetPath = path.resolve(dataDir, "database.json");

const source = fs.readFileSync(sourcePath, "utf8");

const extractArray = (regex) => {
  const match = source.match(regex);
  if (!match) throw new Error(`Pattern not found: ${regex}`);
  const body = match[1];
  return eval("[" + body + "]");
};

const extractObject = (regex) => {
  const match = source.match(regex);
  if (!match) throw new Error(`Pattern not found: ${regex}`);
  const body = match[1];
  return eval("({" + body + "})");
};

const categories = extractArray(/const CATEGORIAS = \[(.*?)\];/s);
const skills = extractArray(/const SKILLS = \[(.*?)\];/s);
const dummy = extractObject(/const dummyData = \{([\s\S]*?)\n\};/);

fs.mkdirSync(dataDir, { recursive: true });
fs.writeFileSync(targetPath, JSON.stringify({
  categories,
  skills,
  collaborators: dummy.colaboradores || []
}, null, 2), "utf8");

console.log("Data exported to", targetPath);
