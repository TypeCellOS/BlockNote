import {insertOrUpdateBlock} from '@blocknote/core'
import data from '@emoji-mart/data'
import Picker from '@emoji-mart/react'
 import { init, SearchIndex } from 'emoji-mart'
import { useEffect, useState } from 'react'

export default function EmojiMenu({items, clearQuery, editor}){
  
    useEffect(()=>{
      console.log('YAHOO')
      console.log(items)
    }, [items])
    const emojiInsert = (emojiToInsert) => {

        clearQuery()
        editor.insertInlineContent([
            {
              type: "emoji",
              props: {
                emoji : emojiToInsert
              },
            },
            " ", // add a space after the emoji
          ]);
    }

    return (<div style={{display: 'grid', justifyItems: 'center', background: 'black', borderRadius: 20, gap: 7, padding: 20, maxHeight: '30vh', minWidth: '30vh', overflowY: 'scroll', gridTemplateColumns: 'repeat(10, 1fr)'}}>
{
  items.map(item=>(
    <p style={{margin: 0, cursor: 'pointer', fontSize: 'large'}} onClick={()=>(emojiInsert(item))}>{item}</p>
  ))
}
    </div>
    )
}