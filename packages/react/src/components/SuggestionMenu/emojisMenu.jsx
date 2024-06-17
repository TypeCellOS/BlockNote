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

    return (<div>
{
  items.map(item=>(
    <p onClick={()=>(emojiInsert(item))}>{item}</p>
  ))
}
    </div>
    )
}