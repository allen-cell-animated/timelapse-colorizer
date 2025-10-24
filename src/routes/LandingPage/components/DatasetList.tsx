import React, { type ReactElement } from "react";
import styled from "styled-components";

import { ButtonStyleLink } from "src/components/Buttons/ButtonStyleLink";
import { PageRoutes } from "src/routes";
import { serializedDataToUrl, serializeViewerParams } from "src/state/utils/store_io";
import { VisuallyHidden } from "src/styles/utils";
import type { DatasetEntry } from "src/types";

const DatasetListContainer = styled.ol`
  padding: 0;
  width: 100%;
  display: grid;
  // Use grid + subgrid to align the title, description, and button for each horizontal
  // row of cards. repeat is used to tile the layout if the cards wrap to a new line.
  grid-template-rows: repeat(3, auto);
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  justify-content: space-around;
  text-align: start;
  gap: 0 20px;
`;

const DatasetCardContainer = styled.li`
  display: grid;
  grid-template-rows: subgrid;
  grid-row: span 3;
  min-width: 180px;
  align-items: flex-start;
  margin-top: 20px;

  & > h3 {
    display: grid;
    margin: 0;
  }
  & > p {
    display: grid;
  }
  & > a {
    // -1px left margin gives button visual alignment with text
    margin: 4px auto 0 -1px;
    display: grid;
  }
`;

type DatasetCardProps = {
  dataset: DatasetEntry;
  index: number;
};

function DatasetCard(props: DatasetCardProps): ReactElement {
  const { dataset, index } = props;
  const viewerLink = `${PageRoutes.VIEWER}?${serializedDataToUrl(serializeViewerParams(dataset.loadParams))}`;

  return (
    <DatasetCardContainer key={index}>
      <h3>{dataset.name}</h3>
      <p>{dataset.description}</p>
      <ButtonStyleLink to={viewerLink}>
        Load<VisuallyHidden> dataset {dataset.name}</VisuallyHidden>
      </ButtonStyleLink>
    </DatasetCardContainer>
  );
}

type DatasetListProps = {
  datasets: DatasetEntry[];
};

/** Displays a list of datasets with a name, description, and load link. */
export default function DatasetList(props: DatasetListProps): ReactElement {
  const { datasets } = props;

  return (
    <DatasetListContainer>
      {datasets.map((dataset, index) => (
        <DatasetCard dataset={dataset} index={index} key={index} />
      ))}
    </DatasetListContainer>
  );
}
