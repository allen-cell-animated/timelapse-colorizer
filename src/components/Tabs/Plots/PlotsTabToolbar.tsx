import styled from "styled-components";

/**
 * Convenience component for consistent toolbar styling for tab contents shown
 * in the Plots tab. Components should wrap their own toolbar content with this
 * component, as well as the optional toolbar content passed in from the parent
 * as props.
 *
 * @example
 * ```tsx
 * <PlotsTabToolbar>
 *   <div>
 *     {Content-specific toolbar goes here}
 *   </div>
 *   {props.toolbar} // optional toolbar content passed in from parent
 * </PlotsTabToolbar>
 * ```
 */
const PlotsTabToolbar = styled.div`
  display: flex;
  /* flex-direction: row; */
  flex-direction: column;
  flex-wrap: nowrap;
  /* justify-content: space-between; */
  /* gap: 30px; */
  gap: 16px;
  width: 100%;
  // Fixes a bug where some focus outlines would be cut off
  position: relative;
  z-index: 1;
`;

export default PlotsTabToolbar;
