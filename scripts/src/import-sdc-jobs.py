"""Reproducible, lossless scalar-field import of the authoritative SDC workbook.

Uses only Python's standard library. --check compares every imported field with
the workbook; --write replaces the runtime collection, never appends to it.
"""
import argparse
from collections import Counter
import json
from pathlib import Path, PurePosixPath
import re
from urllib.parse import urlparse
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "attached_assets/SDC_Job__1792772600597.xlsx"
TARGET = ROOT / "artifacts/api-server/data/jobs.json"
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
RID = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"
HEADERS = [
    "Job ID", "Job title", "Company Name SDN BHD", "Source", "Industry",
    "Education", "Salary (RM) Monthly", "Experience", "Technical skills",
    "Soft skills", "URL",
]


def source_rows(source=SOURCE):
    with zipfile.ZipFile(source) as archive:
        workbook = ET.fromstring(archive.read("xl/workbook.xml"))
        sheets = workbook.findall("m:sheets/m:sheet", NS)
        if len(sheets) != 1 or sheets[0].attrib["name"] != "Sheet1":
            raise ValueError("Expected exactly one worksheet named Sheet1")
        relationships = ET.fromstring(
            archive.read("xl/_rels/workbook.xml.rels")
        )
        targets = {item.attrib["Id"]: item.attrib["Target"] for item in relationships}
        target = targets[sheets[0].attrib[RID]]
        sheet_path = target.lstrip("/") if target.startswith("/") else str(
            PurePosixPath("xl") / target
        )
        shared = []
        if "xl/sharedStrings.xml" in archive.namelist():
            strings = ET.fromstring(archive.read("xl/sharedStrings.xml"))
            shared = [
                "".join(t.text or "" for t in item.findall(".//m:t", NS))
                for item in strings.findall("m:si", NS)
            ]
        sheet = ET.fromstring(archive.read(sheet_path))
        rows = []
        for row in sheet.findall("m:sheetData/m:row", NS):
            cells = {}
            for cell in row.findall("m:c", NS):
                match = re.match(r"[A-Z]+", cell.attrib.get("r", ""))
                if not match:
                    raise ValueError("Cell is missing a valid column reference")
                column = 0
                for char in match.group():
                    column = column * 26 + ord(char) - 64
                if cell.find("m:f", NS) is not None:
                    raise ValueError(f"Formula cell requires review: {cell.attrib['r']}")
                kind = cell.attrib.get("t")
                if kind == "inlineStr":
                    value = "".join(t.text or "" for t in cell.findall(".//m:t", NS))
                else:
                    node = cell.find("m:v", NS)
                    value = "" if node is None else (node.text or "")
                    if kind == "s" and value:
                        value = shared[int(value)]
                    if kind == "e":
                        raise ValueError(f"Excel error cell: {cell.attrib['r']}")
                cells[column - 1] = value
            if any(value.strip() for value in cells.values()):
                rows.append((int(row.attrib["r"]), cells))
        if rows[0][0] != 1:
            raise ValueError("Expected the header on row 1")
        headers = [rows[0][1].get(index, "") for index in range(len(HEADERS))]
        if headers != HEADERS:
            raise ValueError(f"Unexpected headers: {headers!r}")
        records = []
        for row_number, cells in rows[1:]:
            if any(value.strip() for index, value in cells.items() if index >= len(HEADERS)):
                raise ValueError(f"Unmapped source columns on row {row_number}")
            records.append((row_number, {
                header: cells.get(index, "") for index, header in enumerate(HEADERS)
            }))
        return records


def category_for(title):
    title = re.sub(r"\s+", " ", title).strip().casefold()
    patterns = [
        ("software developer", "software"),
        ("mechanical", "mechanical"),
        ("marketing", "digital-marketing"),
        ("human resources", "human-resources"),
        ("accountant", "accounting-finance"),
        ("data analyst", "data-analytics"),
    ]
    matches = [category for text, category in patterns if text in title]
    if len(matches) != 1:
        raise ValueError(f"Career category needs review: {title!r}")
    return matches[0]


def split_skills(value):
    # Match the workbook's comma/semicolon list notation, preserving spelling,
    # order, qualifiers and compound slash-separated requirements.
    return [item.strip() for item in re.split(r",\s*|;\s*", value) if item.strip()]


def imported_jobs():
    jobs = []
    errors = []
    for row_number, row in source_rows():
        try:
            for field in HEADERS:
                if field != "Source" and not row[field].strip():
                    raise ValueError(f"Missing {field}")
            salary_text = row["Salary (RM) Monthly"]
            salary = salary_text.strip()
            if re.fullmatch(r"\d+(?:\.\d+)?", salary):
                salary_number = float(salary)
            elif salary.casefold() == "undisclosed":
                salary_number = None
            elif re.fullmatch(r"\d+-\d+", salary):
                low, high = map(int, salary.split("-"))
                if low > high:
                    raise ValueError("Salary range is reversed")
                salary_number = None  # A band is not a single numeric salary.
            else:
                raise ValueError(f"Unsupported salary value: {salary!r}")
            url = urlparse(row["URL"])
            if url.scheme not in ("http", "https") or not url.netloc:
                raise ValueError("Invalid URL")
            jobs.append({
                "id": row["Job ID"],
                "title": row["Job title"],
                "company": row["Company Name SDN BHD"],
                "source": row["Source"],
                "industry": row["Industry"],
                "education": row["Education"],
                "salaryMonthlyRm": salary_number,
                "salaryText": salary_text,
                "experience": row["Experience"],
                "technicalSkills": split_skills(row["Technical skills"]),
                "softSkills": split_skills(row["Soft skills"]),
                "sector": category_for(row["Job title"]),
                "location": None,
                "postingDate": None,
                "sourceUrl": row["URL"],
            })
        except ValueError as error:
            errors.append(f"Row {row_number} ({row['Job ID']}): {error}")
    ids = [job["id"] for job in jobs]
    if len(set(ids)) != len(ids):
        errors.append("Duplicate Job IDs")
    if len(jobs) != 50 or set(ids) != {f"J{i}" for i in range(1, 51)}:
        errors.append("Expected exactly the complete J1–J50 collection")
    if errors:
        raise ValueError("Import rejected; no output written:\n" + "\n".join(errors))
    return jobs


def main():
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--write", action="store_true")
    mode.add_argument("--check", action="store_true")
    args = parser.parse_args()
    jobs = imported_jobs()
    if args.write:
        TARGET.write_text(json.dumps(jobs, ensure_ascii=False, indent=2) + "\n")
    elif json.loads(TARGET.read_text()) != jobs:
        raise ValueError("Runtime JSON differs from the authoritative workbook import")
    print(json.dumps({
        "records": len(jobs), "rejectedRows": 0,
        "distinctTitles": len({re.sub(r"\s+", " ", j["title"]).strip().casefold() for j in jobs}),
        "categories": dict(Counter(j["sector"] for j in jobs)),
        "exactSalaries": sum(j["salaryMonthlyRm"] is not None for j in jobs),
        "salaryBands": sum(bool(re.fullmatch(r"\d+-\d+", j["salaryText"])) for j in jobs),
        "undisclosedSalaries": sum(j["salaryText"].casefold() == "undisclosed" for j in jobs),
    }, indent=2))


if __name__ == "__main__":
    main()
