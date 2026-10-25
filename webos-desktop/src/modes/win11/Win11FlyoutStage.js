import { createElement } from "../../shared/domUtils.js";

export const FLYOUT_STAGE_CLASS = "win11-flyout-stage";

export function mountFlyoutStage(element, modifierClass = "") {
  const className = modifierClass
    ? `${FLYOUT_STAGE_CLASS} ${modifierClass}`
    : FLYOUT_STAGE_CLASS;
  const stage = createElement("div", { className });
  stage.appendChild(element);
  document.body.appendChild(stage);
  return stage;
}

export function unmountFlyoutStage(stage) {
  if (!stage) return;
  if (stage.parentElement) stage.parentElement.removeChild(stage);
}
