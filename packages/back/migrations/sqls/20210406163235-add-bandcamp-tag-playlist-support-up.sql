INSERT INTO store_playlist_type (store_id, store_playlist_type_regex, store_playlist_type_label, store_playlist_type_store_id) SELECT store_id, '^https:\/\/bandcamp\.com\/tag\/([^/?]+)', 'Tag', 'tag' FROM store WHERE store_name = 'Bandcamp';
