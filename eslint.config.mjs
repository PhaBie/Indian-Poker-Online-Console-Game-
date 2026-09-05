import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import sonarjs from "eslint-plugin-sonarjs";

export default [
    {
        ignores: ["dist/**", "node_modules/**", "*.config.js", "*.config.mjs"],
    },

    {
        files: ["**/*.{ts,tsx}"],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: "latest",
                sourceType: "module",
                ecmaFeatures: {
                    jsx: true,
                },
                project: "./tsconfig.json",
            },
        },
        plugins: {
            "@typescript-eslint": tsPlugin,
            react: reactPlugin,
            "react-hooks": reactHooksPlugin,
            sonarjs: sonarjs,
        },
        rules: {
            // หมวด 1: กฎควบคุมชื่อตัวแปร (Naming Conventions)
            "@typescript-eslint/naming-convention": [
                "error",

                { // ตัวแปรทั่วไปต้องเป็น camelCase และห้ามชื่อตัวแปรสั้นเกินไป 
                    selector: "variable",
                    format: ["camelCase", "UPPER_CASE"],
                    custom: {
                        regex: "^.{2,}$",
                        match: true,
                    },
                },

                { // ตัวแปรประเภท boolean ต้องขึ้นต้นด้วยคำระบุสถานะชัดเจนใน prefix
                    selector: "variable",
                    types: ["boolean"],
                    format: ["PascalCase"],
                    prefix: ["is", "has", "should", "can", "did", "will"],
                },

                { // ฟังก์ชันต้องเป็น camelCase
                    selector: "function",
                    format: ["camelCase"],
                },

                { // Type, Interface, และ Ink Components ต้องเป็น PascalCase
                    selector: ["typeLike", "class"],
                    format: ["PascalCase"],
                }
            ],

            // หมวด 2: กฎปราบ Code Smell และความซับซ้อน
            "sonarjs/cognitive-complexity": ["error", 15], 
            "sonarjs/no-duplicate-string": ["warn", { threshold: 3 }],
            "sonarjs/no-identical-functions": "error",
            "max-lines-per-function": [
                "warn",

                // ขึ้นเตือนทันที ถ้าฟังก์ชันยาวเกิน 50 บรรทัด
                { max: 50, skipBlankLines: true, skipComments: true },
            ],

            // ห้ามเขียน if-else หรือ loop ซ้อนลึกเกิน 3 ชั้น
            "max-depth": ["error", 3],

            // หมวด 3: กฎระเบียบของ TypeScript
            "@typescript-eslint/no-explicit-any": "error",
            "@typescript-eslint/no-unused-vars": [
                "error",

            // บล็อกตัวแปรที่ประกาศทิ้งไว้แล้วไม่ได้ใช้
                { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
            ],

            // บังคับการนำเข้าชนิดข้อมูลด้วย 'type' เพื่อให้ Bundler ลบออกได้หมดจด และลดความเสี่ยงในช่วงรันไทม์
            "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],

            // หมวด 4: กฎระเบียบของ React และ Ink

            // บังคับ Component ของ Ink ให้ขึ้นต้นด้วยตัวพิมพ์ใหญ่
            "react/jsx-pascal-case": "error",

            // บังคับการเรียก Hook ให้ถูกต้องตามกฎ React
            "react-hooks/rules-of-hooks": "error",

            // เตือนเมื่อลืมใส่ dependency ใน useEffect
            "react-hooks/exhaustive-deps": "warn",

            // จำเป็นต้องใส่ key เสมอเมื่อมีการวนลูปสร้างคอมโพเนนต์ เพื่อป้องกันปัญหา UI เรนเดอร์ผิดพลาด
            "react/jsx-key": "error",

            // ป้องกันการพิมพ์ชื่อ Property ผิดหรือพิมพ์ชื่อที่ไม่มีอยู่จริง (เช่น พิมพ์ class แทน className)
            "react/no-unknown-property": "error",

            // ปิดการใช้งาน PropTypes เนื่องจากโปรเจกต์นี้ใช้ TypeScript ควบคุมชนิดข้อมูลอยู่แล้ว
            "react/prop-types": "off",

            // ปิดข้อบังคับที่ต้อง import React ในทุกไฟล์ที่ใช้ JSX (รองรับตั้งแต่ React 17 เป็นต้นมา)
            "react/react-in-jsx-scope": "off",

            // หมวด 5: แนวปฏิบัติที่ดีและข้อควรระวังทั่วไป (General Best Practices)

            // บังคับให้เปรียบเทียบค่าแบบเข้มงวด (=== และ !==) เพื่อป้องกันความผิดพลาดจากการแปลงชนิดข้อมูลแฝง
            "eqeqeq": ["error", "always"],

            // ห้ามแสดงผลผ่าน console.log โดยตรง เพราะจะรบกวนการวาดหน้าจอ (Render) ของตัว Ink
            "no-console": "warn",
        }
    }
]