<DOCUMENT>
  <PAGE
    dpi={100}
    size="A4"
    style={{
      fontFamily: 'Inter',
      fontSize: 12,
      lineHeight: 1.5,
      paddingBottom: 65,
      paddingHorizontal: 35,
      paddingTop: 35
    }}
  >
    <React.Fragment key=".1:$math-block">
      <VIEW
        style={{
          alignItems: undefined,
          backgroundColor: undefined,
          color: undefined,
          paddingVertical: 2.25,
          textAlign: undefined
        }}
      >
        <VIEW
          style={{
            alignItems: 'center'
          }}
        >
          <Math>
            {`a^2 = \sqrt{b^2 + c^2}`}
          </Math>
        </VIEW>
      </VIEW>
    </React.Fragment>
    <React.Fragment key=".1:$paragraph-with-inline-math">
      <VIEW
        style={{
          alignItems: undefined,
          backgroundColor: undefined,
          color: undefined,
          paddingVertical: 2.25,
          textAlign: 'left'
        }}
      >
        <TEXT>
          <TEXT style={{}}>
            Inline math:{' '}
          </TEXT>
          <TEXT
            style={{
              fontFamily: 'GeistMono'
            }}
          >
            <TEXT style={{}}>
              {`e^{i\pi} + 1 = 0`}
            </TEXT>
          </TEXT>
        </TEXT>
      </VIEW>
    </React.Fragment>
  </PAGE>
</DOCUMENT>