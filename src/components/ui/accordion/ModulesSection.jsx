/* eslint-disable no-unused-vars */
import React from "react";
import Accordion from "./Accordion.jsx";

const ModulesSection = ({ modules }) => {
    return (
        <Accordion
            modules={modules}
            type="single"
            variant="default"
            accordionType="modules"
            showIcons={true}
            showDuration={true}
            defaultOpenFirst={true}
        />
    );
};

export default ModulesSection;
