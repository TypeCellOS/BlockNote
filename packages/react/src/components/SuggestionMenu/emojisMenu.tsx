
type Props= {
  items: string[],
  emojiInsert: (item : never) => void,
  selectedIndex: number
}
  export default function EmojiMenu({items, emojiInsert, selectedIndex} : Props) : JSX.Element {
  //this is the component which renders emoji picker with the emojis searched.


    return (
    <div className="bn-emoji-menu" style={{ gridTemplateColumns: 'repeat(10, 1fr)'}}>
      {
        items.map((item, index)=>(
          <p key={index} className={index === selectedIndex ? 'emoji-selected' : ''} onClick={()=>(emojiInsert(item as never))}>{item}</p>
        ))
      }
    </div>
    )
}