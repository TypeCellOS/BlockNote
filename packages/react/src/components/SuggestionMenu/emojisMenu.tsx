
type Props= {
  items: string[],
  emojiInsert: (item : never) => void,
  selectedIndex: number
}
  export default function EmojiMenu({items, emojiInsert, selectedIndex} : Props) : JSX.Element {
  //this is the component which renders emoji picker with the emojis searched.


    return (
    <div style={{display: 'grid', justifyItems: 'center', background: '#1d1d1d', borderRadius: 20, gap: 7, padding: 20, maxHeight: '30vh', minWidth: '30vh', overflowY: 'scroll', gridTemplateColumns: 'repeat(10, 1fr)'}}>
      {
        items.map((item, index)=>(
          <p key={index} style={{margin: 0, padding: 4, borderRadius: 10, cursor: 'pointer', fontSize: 'large', background: selectedIndex === index ? 'rgb(70, 70, 70)' : 'transparent'}} onClick={()=>(emojiInsert(item as never))}>{item}</p>
        ))
      }
    </div>
    )
}