/** Variables defining the editor theme. Values are CSS strings, including units. */
export type Theme = Partial<{
  textColor: Partial<{
    placeholder: string;
    primary: string;
    menu: string;
    tooltip: string;
    hovered: string;
    selected: string;
    disabled: string;
    muted: string;
    gray: string;
    brown: string;
    red: string;
    orange: string;
    yellow: string;
    green: string;
    blue: string;
    purple: string;
    pink: string;
    secondary: string;
  }>;
  backgroundColor: Partial<{
    muted: string;
    editor: string;
    menu: string;
    tooltip: string;
    hovered: string;
    selected: string;
    disabled: string;
    gray: string;
    brown: string;
    red: string;
    orange: string;
    yellow: string;
    green: string;
    blue: string;
    purple: string;
    pink: string;
  }>;
  border: Partial<{
    color: string;
    colorStrong: string;
  }>;
  focusRing: Partial<{
    color: string;
  }>;
  fontFamily: Partial<{
    default: string;
  }>;
  radius: Partial<{
    small: string;
    medium: string;
    large: string;
  }>;
  shadow: Partial<{
    default: string;
    subtle: string;
  }>;
  success: Partial<{
    background: string;
    color: string;
  }>;
  warning: Partial<{
    color: string;
  }>;
  accent: Partial<{
    color: string;
  }>;
  error: Partial<{
    color: string;
    background: string;
  }>;
  /** Advanced element variable overrides. Defaults apply the theme to each element. */
  elements: Partial<{
    toggleControl: Partial<{
      radius: string;
      hoverBackground: string;
    }>;
    sourceConfirmButton: Partial<{
      background: string;
      color: string;
      radius: string;
      hoverBackground: string;
      hoverColor: string;
    }>;
    versioningPagination: Partial<{
      color: string;
    }>;
    emojiFooter: Partial<{
      borderColor: string;
    }>;
    emojiCategory: Partial<{
      background: string;
      color: string;
    }>;
    emojiSearch: Partial<{
      background: string;
      color: string;
    }>;
    threadsSidebar: Partial<{
      radius: string;
    }>;
    colorIcon: Partial<{
      border: string;
      radius: string;
    }>;
    suggestion: Partial<{
      background: string;
      color: string;
      successBackground: string;
      successColor: string;
    }>;
    threadMark: Partial<{
      color: string;
    }>;
    filePlaceholder: Partial<{
      background: string;
      color: string;
      hoverBackground: string;
    }>;
    previewPlaceholder: Partial<{
      background: string;
      color: string;
      hoverBackground: string;
    }>;
    sourcePopup: Partial<{
      background: string;
      border: string;
      radius: string;
      shadow: string;
      color: string;
    }>;
    toggleButton: Partial<{
      color: string;
    }>;
    toggleAddButton: Partial<{
      color: string;
    }>;
    blockSelection: Partial<{
      accentColor: string;
    }>;
    sourceError: Partial<{
      color: string;
      background: string;
      border: string;
    }>;
    diagram: Partial<{
      series8: string;
      series7: string;
      series6: string;
      series5: string;
      series4: string;
      series3: string;
      series2: string;
      series1: string;
      radius: string;
      error: string;
      critical: string;
      accent: string;
      border: string;
      backgroundAlt: string;
      background: string;
      line: string;
      fg: string;
      bg: string;
      mutedColor: string;
    }>;
    emojiPicker: Partial<{
      background: string;
      hoverBackground: string;
      fontFamily: string;
      color: string;
      itemFocusRingColor: string;
      focusRingColor: string;
      borderColor: string;
    }>;
    root: Partial<{
      fontFamily: string;
    }>;
    badge: Partial<{
      background: string;
      color: string;
    }>;
    fileInput: Partial<{
      background: string;
      color: string;
      fontFamily: string;
      hoverBackground: string;
      borderColor: string;
    }>;
    inputPlaceholder: Partial<{
      color: string;
      fontFamily: string;
    }>;
    menu: Partial<{
      background: string;
      border: string;
      radius: string;
      shadow: string;
      color: string;
    }>;
    menuItem: Partial<{
      background: string;
      radius: string;
      color: string;
      hoverBackground: string;
      hoverColor: string;
    }>;
    tabs: Partial<{
      background: string;
      hoverBackground: string;
      color: string;
      hoverColor: string;
    }>;
    textInput: Partial<{
      background: string;
      borderColor: string;
      color: string;
      fontFamily: string;
    }>;
    toolbar: Partial<{
      background: string;
      border: string;
      radius: string;
      shadow: string;
    }>;
    toolbarButton: Partial<{
      background: string;
      radius: string;
      color: string;
      hoverBackground: string;
      hoverColor: string;
      selectedBackground: string;
      selectedColor: string;
      disabledBackground: string;
      disabledColor: string;
    }>;
    formPopover: Partial<{
      background: string;
      border: string;
      radius: string;
      shadow: string;
      color: string;
      hoverBackground: string;
    }>;
    suggestionMenu: Partial<{
      background: string;
      border: string;
      radius: string;
      shadow: string;
      color: string;
    }>;
    suggestionMenuItem: Partial<{
      hoverBackground: string;
    }>;
    suggestionMenuIcon: Partial<{
      color: string;
      background: string;
      radius: string;
    }>;
    suggestionMenuTitle: Partial<{
      color: string;
    }>;
    suggestionMenuSubtitle: Partial<{
      color: string;
    }>;
    suggestionMenuLabel: Partial<{
      color: string;
    }>;
    suggestionMenuLoader: Partial<{
      color: string;
    }>;
    sideMenu: Partial<{
      hoverBackground: string;
      iconColor: string;
    }>;
    panel: Partial<{
      background: string;
      border: string;
      radius: string;
      shadow: string;
    }>;
    panelButton: Partial<{
      background: string;
      borderColor: string;
      radius: string;
      color: string;
      hoverBackground: string;
    }>;
    tableHandle: Partial<{
      background: string;
      border: string;
      radius: string;
      shadow: string;
      iconColor: string;
      hoverBackground: string;
    }>;
    tooltip: Partial<{
      background: string;
      border: string;
      radius: string;
      shadow: string;
      color: string;
    }>;
    thread: Partial<{
      selectedColor: string;
      background: string;
      border: string;
      radius: string;
      shadow: string;
      color: string;
    }>;
    actionToolbar: Partial<{
      background: string;
      border: string;
      radius: string;
    }>;
    actionToolbarButton: Partial<{
      background: string;
      radius: string;
      color: string;
      hoverBackground: string;
      hoverColor: string;
      selectedBackground: string;
      selectedColor: string;
      disabledBackground: string;
      disabledColor: string;
    }>;
    badgeToggle: Partial<{
      background: string;
      border: string;
      color: string;
    }>;
    combobox: Partial<{
      background: string;
      border: string;
      radius: string;
      shadow: string;
      color: string;
      errorColor: string;
    }>;
    quote: Partial<{
      borderColor: string;
      color: string;
    }>;
    divider: Partial<{
      borderColor: string;
    }>;
    pageBreak: Partial<{
      borderColor: string;
    }>;
    highlight: Partial<{
      grayText: string;
      brownText: string;
      redText: string;
      orangeText: string;
      yellowText: string;
      greenText: string;
      blueText: string;
      purpleText: string;
      pinkText: string;
      grayBackground: string;
      brownBackground: string;
      redBackground: string;
      orangeBackground: string;
      yellowBackground: string;
      greenBackground: string;
      blueBackground: string;
      purpleBackground: string;
      pinkBackground: string;
    }>;
    column: Partial<{
      borderColor: string;
      resizeColor: string;
    }>;
    editor: Partial<{
      fontFamily: string;
      background: string;
      radius: string;
      color: string;
      indentGuideColor: string;
      placeholderColor: string;
    }>;
  }>;
}>;
