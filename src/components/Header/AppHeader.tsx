import styled from "styled-components";

/**
 * Top title bar for the app, which will stick to the top of the page.
 * Child components will be spaced apart evenly.
 * */
const Header = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  width: auto;
  height: fit-content;
  min-height: var(--header-content-height);
  padding: 12px 30px;
  border-bottom: 1px solid var(--color-borders);
  gap: 10px;
  position: sticky;
  background-color: var(--color-background);
  z-index: 100;
  top: 0;
  left: 0;
`;

export default Header;
