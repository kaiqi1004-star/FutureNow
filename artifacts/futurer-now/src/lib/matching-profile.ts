import { validateProfile, type SavedProfile } from "./skills-profile.ts";
import { isBroadTechnicalArea } from "./skill-catalogue.ts";

/** Only explicitly saved skill names go to the matcher. Context and free text
 * must never be interpreted as demonstrated skills or sent with this request. */
export function matchingProfileInput(saved: SavedProfile | null) {
  return {
    currentSkills: saved?.profile.skills
      .filter((skill) => skill.category !== "Broad Technical Areas" && !isBroadTechnicalArea(skill.name))
      .map((skill) => skill.name.trim())
      .filter(Boolean) ?? [],
    missingFields: saved ? Object.values(validateProfile(saved.profile)) :
      ["Save a skills profile with at least one genuine skill before generating matches."],
    isDraft: saved ? !saved.submitted : false,
  };
}
