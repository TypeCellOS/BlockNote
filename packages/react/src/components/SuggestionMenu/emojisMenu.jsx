import {useSuggestionMenuKeyboardNavigation} from './hooks/useSuggestionMenuKeyboardNavigation'
import { useEffect, useState } from 'react'

export default function EmojiMenu({items, emojiInsert, selectedIndex}){

    return (<div style={{display: 'grid', justifyItems: 'center', background: 'black', borderRadius: 20, gap: 7, padding: 20, maxHeight: '30vh', minWidth: '30vh', overflowY: 'scroll', gridTemplateColumns: 'repeat(10, 1fr)'}}>
{
  items.map((item, index)=>(
    <p key={index} style={{margin: 0, cursor: 'pointer', fontSize: 'large', background: selectedIndex === index ? 'cyan' : 'transparent'}} onClick={()=>(emojiInsert(item))}>{item}</p>
  ))
}
    </div>
    )
}