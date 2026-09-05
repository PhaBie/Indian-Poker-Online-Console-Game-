import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import sonarjs from "eslint-plugin-sonarjs";

export default [
    {
        ignores: ["dist/**", "node_modules/**", "*.config.js", "*.config.mjs", "testSum.ts"],
    },
    // --- 1. การตั้งค่าพื้นฐานของโปรเจกต์ (ครอบคลุมทั้ง Source และ Test) ---
    {
        files: ["src/**/*.{ts,tsx}", "Test/**/*.{ts,tsx}"],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: "latest",
                sourceType: "module",
                ecmaFeatures: {
                    jsx: true,
                },
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        plugins: {
            "@typescript-eslint": tsPlugin,
            react: reactPlugin,
            "react-hooks": reactHooksPlugin,
            sonarjs: sonarjs,
        },
        rules: {
            // มาตรฐานการตั้งชื่อพื้นฐาน
            "@typescript-eslint/naming-convention": [
                "error",
                {
                    selector: "variable",
                    format: ["camelCase", "UPPER_CASE"],
                },
                {
                    selector: "variable",
                    types: ["boolean"],
                    format: ["PascalCase"],
                    prefix: ["is", "has", "should", "can", "did", "will"],
                },
                {
                    selector: "function",
                    format: ["camelCase"],
                },
                {
                    selector: ["typeLike", "class"],
                    format: ["PascalCase"],
                }
            ],

            // การจัดการ Code Smell และความซับซ้อนของโค้ด
            "sonarjs/cognitive-complexity": ["warn", 15],
            "sonarjs/no-duplicate-string": ["warn", { threshold: 3 }],
            "sonarjs/no-identical-functions": "error",
            "max-lines-per-function": [
                "warn",
                { max: 50, skipBlankLines: true, skipComments: true },
            ],
            "max-depth": ["error", 3],

            // กฎและมาตรฐานสำหรับ TypeScript
            "@typescript-eslint/no-explicit-any": "error",
            "@typescript-eslint/no-unused-vars": [
                "error",
                { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
            ],
            "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],

            // กฎพื้นฐานสำหรับ React/Ink (ไม่ใช้ no-unknown-property เพราะ Ink ไม่ได้อิง DOM)
            "react-hooks/rules-of-hooks": "error",
            "react-hooks/exhaustive-deps": "warn",
            "react/jsx-key": "error",
            "react/prop-types": "off",
            "react/react-in-jsx-scope": "off",

            // แนวทางปฏิบัติที่ดีทั่วไป
            "eqeqeq": ["error", "always"],
            "no-var": "error",
            "prefer-const": "error",
            "object-shorthand": ["error", "always"],
            "curly": ["error", "all"],

            // แจ้งเตือนการใช้ Console logging ทุกจุดเป็นค่าเริ่มต้น
            "no-console": "warn",
        }
    },
    // --- 2. การยกเว้นกฎเฉพาะสำหรับ React / UI ---
    {
        files: ["src/client/ui/**/*.{ts,tsx}"],
        rules: {
            // อนุญาต PascalCase สำหรับ Component ในส่วน UI (ต้องเก็บกฎ Boolean กับ TypeLike ไว้ด้วย)
            "@typescript-eslint/naming-convention": [
                "error",
                {
                    selector: "variable",
                    format: ["camelCase", "UPPER_CASE", "PascalCase"],
                },
                {
                    selector: "variable",
                    types: ["boolean"],
                    format: ["PascalCase"],
                    prefix: ["is", "has", "should", "can", "did", "will"],
                },
                {
                    selector: "function",
                    format: ["camelCase", "PascalCase"],
                },
                {
                    selector: ["typeLike", "class"],
                    format: ["PascalCase"],
                }
            ],

            // บังคับ Component ของ Ink ให้ขึ้นต้นด้วยตัวพิมพ์ใหญ่
            "react/jsx-pascal-case": "error",
        }
    },
    // --- 3. การยกเว้นกฎเฉพาะสำหรับชุดทดสอบ (Test) ---
    {
        files: ["Test/**/*.{ts,tsx}"],
        rules: {
            // ปิดกฎเหล่านี้ในไฟล์ทดสอบ เพื่อให้ตั้ง Fixtures ซ้ำๆ หรือเขียน Describe ยาวๆ ได้สะดวก
            "max-lines-per-function": "off",
            "sonarjs/no-duplicate-string": "off",
            "sonarjs/no-identical-functions": "off"
        }
    }
];